const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const { execFile } = require('child_process');
const ScanResult = require('../models/ScanResult');
const fs = require('fs');
const path = require('path');
const scriptPath = path.join(__dirname, '..', 'scripts', 'scan-and-send.sh');

// POST /api/scan-results/scan-all
router.post('/scan-all', authenticateToken, async (req, res) => {
  console.log('POST /api/scan-results/scan-all called');
  const { githubUrl } = req.body;
  if (!githubUrl) {
    return res.status(400).json({ error: 'githubUrl is required' });
  }

  console.log('Running scan script at:', scriptPath);
  console.log('For repository:', githubUrl);

  // Vérifier si le script existe
  if (!fs.existsSync(scriptPath)) {
    console.error('Script not found at:', scriptPath);
    return res.status(500).json({ error: 'Scan script not found' });
  }

  // Rendre le script exécutable
  try {
    await fs.promises.chmod(scriptPath, '755');
  } catch (error) {
    console.error('Error making script executable:', error);
  }

  execFile(scriptPath, [githubUrl], { maxBuffer: 1024 * 1024 * 50 }, async (error, stdout, stderr) => {
    if (error) {
      console.error('Script error:', error);
      console.error('Script stderr:', stderr);
      console.error('Script stdout:', stdout);
      return res.status(500).json({ error: stderr || error.message });
    }

    // Chercher la ligne LOG_FILE_PATH:... dans stdout
    const logFileMatch = stdout.match(/LOG_FILE_PATH:(.*)/);
    if (!logFileMatch) {
      return res.status(500).json({ error: 'Chemin du fichier log non trouvé dans la sortie du script.' });
    }
    const logFilePath = logFileMatch[1].trim();

    // Lire le fichier log
    fs.readFile(logFilePath, 'utf8', (err, logData) => {
      if (err) {
        return res.status(500).json({ error: 'Impossible de lire le fichier log.', details: err.message });
      }
      // Extraire la portion entre les deux marqueurs
      const startMarker = '=== Résultat combiné de tous les outils ===';
      const endMarker = 'Analysis complete';
      const startIdx = logData.indexOf(startMarker);
      const endIdx = logData.indexOf(endMarker, startIdx);
      if (startIdx === -1 || endIdx === -1) {
        return res.status(500).json({ error: 'Impossible de trouver les marqueurs dans le log.' });
      }
      // Extraire la portion texte
      let jsonSection = logData.substring(startIdx + startMarker.length, endIdx).trim();
      // Ne garder que les lignes qui semblent être du JSON
      const jsonLines = jsonSection.split('\n').filter(line => {
        const l = line.trim();
        return l.startsWith('{') || l.startsWith('[') || l.endsWith('}') || l.endsWith(']') || l.includes(':');
      });
      jsonSection = jsonLines.join('');
      let results = null;
      try {
        results = JSON.parse(jsonSection);
      } catch (e) {
        return res.status(500).json({ error: 'Parsing JSON échoué', details: e.message, raw: jsonSection });
      }
      // Nettoyer le fichier log temporaire
      fs.unlink(logFilePath, () => {});
      // Retourner le résultat directement (pas de stockage en base)
      res.status(200).json(results);
    });
  });
});

// GET /api/scan-results/results
router.get('/scan-all', authenticateToken, async (req, res) => {
  const { repositoryUrl } = req.query;
  if (!repositoryUrl) {
    return res.status(400).json({ error: 'Repository URL is required' });
  }

  const url = repositoryUrl.replace(/\/+$/, '');
  const result = await ScanResult.findOne({
    $or: [
      { repositoryUrl: url },
      { repositoryUrl: url + '/' }
    ]
  }).sort({ createdAt: -1 });

  if (!result) return res.json({});

  function mapStoredResultsToFrontend(results) {
    const sonarIssues = (results.sonarcloud_vulnerabilities?.issues || results.sonarcloud_vulnerabilities?.vulnerabilities || []);
    const sonar = {
      component: results.sonarcloud_metrics?.component || {},
      issues: sonarIssues.slice(0, 4),
      summary: sonarIssues.length === 0 ? 'No known vulnerabilities' : `${sonarIssues.length} vulnerabilities found`
    };

    const snykVulns = (results.snyk?.vulnerabilities || []).map(v => ({
      id: v.id || v.ID || '',
      title: v.title || v.Title || '',
      packageName: v.packageName || v.PkgName || '',
      severity: v.severity || v.Severity || '',
      description: v.description || v.Description || ''
    }));
    const snyk = {
      ...results.snyk,
      vulnerabilities: snykVulns.slice(0, 4),
      summary: snykVulns.length === 0 ? 'No known vulnerabilities' : `${snykVulns.length} vulnerabilities found`
    };

    let trivyResults = [];
    if (Array.isArray(results.trivy?.Results)) {
      trivyResults = results.trivy.Results.map(r => ({
        Target: r.Target,
        Vulnerabilities: (r.Vulnerabilities || []).slice(0, 4)
      }));
    } else if (Array.isArray(results.trivy)) {
      trivyResults = results.trivy.map(r => ({
        Target: r.Target,
        Vulnerabilities: (r.Vulnerabilities || []).slice(0, 4)
      }));
    }
    const trivyVulnCount = trivyResults.reduce((acc, curr) => acc + (curr.Vulnerabilities?.length || 0), 0);
    const trivy = {
      ...results.trivy,
      Results: trivyResults,
      summary: trivyVulnCount === 0 ? 'No known vulnerabilities' : `${trivyVulnCount} vulnerabilities found`
    };

    const owaspVulns = results.dependency_check?.dependencies?.flatMap(dep =>
      (dep.vulnerabilities || []).map(vuln => ({
        cve: vuln.name,
        component: dep.fileName,
        version: dep.version,
        severity: vuln.severity,
        cwe: vuln.cwe,
        cvss: vuln.cvssv3 || vuln.cvssv2,
        description: vuln.description
      }))
    ) || [];
    const owasp = {
      vulnerabilities: owaspVulns.slice(0, 4),
      summary: owaspVulns.length === 0 ? 'No known vulnerabilities' : `${owaspVulns.length} vulnerabilities found`,
      metrics: { critical: 0, high: 0, medium: 0, low: 0 }
    };

    return { sonar, snyk, trivy, owasp };
  }

  const mapped = mapStoredResultsToFrontend(result.results);
  res.json(mapped);
});

// Route de test (facultative)
router.post('/test-save', async (req, res) => {
  try {
    const testData = {
      repositoryUrl: 'https://github.com/test/test',
      results: {
        sonar: { issues: [{ type: 'bug', message: 'Test issue' }] },
        snyk: { vulnerabilities: [] },
        trivy: [],
        dependency_check: {}
      },
      createdAt: new Date()
    };
    const result = await ScanResult.create(testData);
    res.json({ message: 'Données test insérées', id: result._id });
  } catch (err) {
    console.error('Erreur test-save:', err);
    res.status(500).json({ error: err.message });
  }
});

// Route pour lancer un scan SonarCloud dynamique (optionnel)
router.post('/scan-sonarcloud', authenticateToken, async (req, res) => {
  const { repoUrl } = req.body;
  if (!repoUrl) {
    return res.status(400).json({ error: 'repoUrl is required' });
  }
  try {
    // ... (inchangé)
  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

module.exports = router;
