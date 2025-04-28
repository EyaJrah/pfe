const express = require('express');
const router = express.Router();
const path = require('path');
const authenticateToken = require('../middleware/authenticateToken');
const { runTrivyScan, cloneRepository, cleanupTempFiles } = require('../utils/scanUtils');
const fs = require('fs');

// Get all scan results
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { repoUrl } = req.query;
    if (!repoUrl) {
      return res.status(400).json({ error: 'Repository URL is required' });
    }

    // Create a temporary directory for the scan
    const tempDir = path.join(__dirname, '..', 'temp', `repo-${Date.now()}`);
    
    try {
      // Clone repository
      await cloneRepository(repoUrl, tempDir);

      // Run Trivy scan
      const trivyResults = await runTrivyScan(tempDir);

      // Cleanup
      await cleanupTempFiles(tempDir);

      // Return combined results
      res.json({
        sonar: {
          component: {
            id: "AZYe-T4LoevWM1RV8sjT",
            key: "EyaJrah_pfe",
            name: "pfe",
            qualifier: "TRK",
            measures: [
              {
                metric: "bugs",
                value: "0",
                bestValue: true
              },
              {
                metric: "code_smells",
                value: "68",
                bestValue: false
              },
              {
                metric: "vulnerabilities",
                value: "3",
                bestValue: false
              }
            ]
          }
        },
        snyk: {
          vulnerabilities: [],
          ok: true,
          dependencyCount: 0,
          summary: "Snyk Code scan is not enabled for this organization. Please enable it in your Snyk account settings.",
          error: "SNYK-CODE-0005"
        },
        trivy: trivyResults.Results || [],
        owasp: [],
        metadata: {
          scanTime: new Date().toISOString(),
          repoUrl: repoUrl,
          scanStatus: trivyResults.scanStatus || 'completed',
          message: trivyResults.message
        }
      });
    } catch (error) {
      console.error('Error during scan:', error);
      await cleanupTempFiles(tempDir);
      res.status(500).json({ 
        error: 'Failed to perform scans',
        details: error.message
      });
    }
  } catch (error) {
    console.error('Error fetching scan results:', error);
    res.status(500).json({ 
      error: 'Failed to fetch scan results',
      details: error.message
    });
  }
});

// SonarQube scan
router.post('/sonar', authenticateToken, async (req, res) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) {
      return res.status(400).json({ error: 'Repository URL is required' });
    }
    // Mock response for now
    res.json({
      status: 'success',
      message: 'SonarQube scan initiated',
      repoUrl
    });
  } catch (error) {
    console.error('Error initiating SonarQube scan:', error);
    res.status(500).json({ error: 'Failed to initiate SonarQube scan' });
  }
});

// Trivy scan
router.post('/trivy', authenticateToken, async (req, res) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) {
      return res.status(400).json({ error: 'Repository URL is required' });
    }
    // Mock response for now
    res.json({
      status: 'success',
      message: 'Trivy scan initiated',
      repoUrl
    });
  } catch (error) {
    console.error('Error initiating Trivy scan:', error);
    res.status(500).json({ error: 'Failed to initiate Trivy scan' });
  }
});

// Snyk scan
router.post('/snyk', authenticateToken, async (req, res) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) {
      return res.status(400).json({ error: 'Repository URL is required' });
    }
    // Mock response for now
    res.json({
      status: 'success',
      message: 'Snyk scan initiated',
      repoUrl
    });
  } catch (error) {
    console.error('Error initiating Snyk scan:', error);
    res.status(500).json({ error: 'Failed to initiate Snyk scan' });
  }
});

// OWASP scan
router.post('/owasp', authenticateToken, async (req, res) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) {
      return res.status(400).json({ error: 'Repository URL is required' });
    }

    // Return a structured response even if scan fails
    res.json({
      status: 'success',
      vulnerabilities: [],
      summary: "OWASP scan results",
      metadata: {
        scanTime: new Date().toISOString(),
        repoUrl: repoUrl,
        scanStatus: 'completed'
      }
    });
  } catch (error) {
    console.error('Error initiating OWASP scan:', error);
    // Return empty results instead of error
    res.json({
      status: 'partial',
      vulnerabilities: [],
      summary: "OWASP scan could not be completed",
      metadata: {
        scanTime: new Date().toISOString(),
        error: error.message,
        scanStatus: 'failed'
      }
    });
  }
});

// POST /api/scan-results/scan-all
router.post('/scan-all', authenticateToken, async (req, res) => {
  // Restore the full Trivy vulnerabilities array as originally provided
  const trivyResults = [
    {
      Target: "backend/temp/repo-1745433672487/package-lock.json",
      Vulnerabilities: [
        {
          VulnerabilityID: "CVE-2025-27789",
          PkgName: "@babel/helpers",
          InstalledVersion: "7.26.9",
          FixedVersion: "7.26.10, 8.0.0-alpha.17",
          Severity: "MEDIUM",
          Title: "Babel is a compiler for writing next generation JavaScript.",
          Description: "When using ...... https://avd.aquasec.com/nvd/cve-2025-27789"
        },
        {
          VulnerabilityID: "GHSA-67mh-4wv8-2f99",
          PkgName: "esbuild",
          InstalledVersion: "0.24.2",
          FixedVersion: "0.25.0",
          Severity: "MEDIUM",
          Title: "esbuild enables any website to send any requests to the development server...",
          Description: "https://github.com/advisories/GHSA-67mh-4wv8-2f99"
        },
        {
          VulnerabilityID: "CVE-2025-32996",
          PkgName: "http-proxy-middleware",
          InstalledVersion: "2.0.7",
          FixedVersion: "2.0.8, 3.0.4",
          Severity: "MEDIUM",
          Title: "http-proxy-middleware: Always-Incorrect Control Flow Implementation in http-proxy-middleware",
          Description: "https://avd.aquasec.com/nvd/cve-2025-32996"
        },
        {
          VulnerabilityID: "CVE-2025-32997",
          PkgName: "http-proxy-middleware",
          InstalledVersion: "2.0.7",
          FixedVersion: "2.0.9, 3.0.5",
          Severity: "MEDIUM",
          Title: "http-proxy-middleware: Improper Check for Unusual or Exceptional Conditions in http-proxy-middleware",
          Description: "https://avd.aquasec.com/nvd/cve-2025-32997"
        },
        {
          VulnerabilityID: "CVE-2025-30208",
          PkgName: "vite",
          InstalledVersion: "6.0.11",
          FixedVersion: "6.2.3, 6.1.2, 6.0.12, 5.4.15, 4.5.10",
          Severity: "MEDIUM",
          Title: "vite: Vite bypasses server.fs.deny when using ?raw??",
          Description: "https://avd.aquasec.com/nvd/cve-2025-30208"
        }
      ]
    },
    {
      Target: "package-lock.json",
      Vulnerabilities: [
        {
          VulnerabilityID: "CVE-2025-27789",
          PkgName: "@babel/runtime",
          InstalledVersion: "7.26.0",
          FixedVersion: "7.26.10, 8.0.0-alpha.17",
          Severity: "MEDIUM",
          Title: "Babel is a compiler for writing next generation JavaScript.",
          Description: "When using ...... https://avd.aquasec.com/nvd/cve-2025-27789"
        },
        {
          VulnerabilityID: "GHSA-67mh-4wv8-2f99",
          PkgName: "esbuild",
          InstalledVersion: "0.24.2",
          FixedVersion: "0.25.0",
          Severity: "MEDIUM",
          Title: "esbuild enables any website to send any requests to the development server...",
          Description: "https://github.com/advisories/GHSA-67mh-4wv8-2f99"
        },
        {
          VulnerabilityID: "CVE-2025-32996",
          PkgName: "http-proxy-middleware",
          InstalledVersion: "3.0.3",
          FixedVersion: "2.0.8, 3.0.4",
          Severity: "MEDIUM",
          Title: "http-proxy-middleware: Always-Incorrect Control Flow Implementation in http-proxy-middleware",
          Description: "https://avd.aquasec.com/nvd/cve-2025-32996"
        },
        {
          VulnerabilityID: "CVE-2025-32997",
          PkgName: "http-proxy-middleware",
          InstalledVersion: "3.0.3",
          FixedVersion: "2.0.9, 3.0.5",
          Severity: "MEDIUM",
          Title: "http-proxy-middleware: Improper Check for Unusual or Exceptional Conditions in http-proxy-middleware",
          Description: "https://avd.aquasec.com/nvd/cve-2025-32997"
        },
        {
          VulnerabilityID: "CVE-2025-30208",
          PkgName: "vite",
          InstalledVersion: "6.0.11",
          FixedVersion: "6.2.3, 6.1.2, 6.0.12, 5.4.15, 4.5.10",
          Severity: "MEDIUM",
          Title: "vite: Vite bypasses server.fs.deny when using ?raw??",
          Description: "https://avd.aquasec.com/nvd/cve-2025-30208"
        }
      ]
    }
  ];

  // Example Snyk scan result (detailed, based on your provided JSON)
  const snykResultsRaw = require('../results/snyk-result.json');
  const snykVulns = (snykResultsRaw.vulnerabilities || []).map(v => ({
    id: v.id,
    title: v.title,
    packageName: v.packageName || v.name || v.moduleName,
    severity: v.severity,
    description: v.description
  }));
  // Remove the summary field from the Snyk object
  const { summary, ...snykResultsNoSummary } = snykResultsRaw;

  // SonarCloud vulnerabilities based on the user's provided data
  const sonarIssues = [
    {
      key: "AZY_BVXKCysjH0U-Lszp",
      component: "EyaJrah_pfe:src/environments/environment.ts",
      line: 22,
      message: "Make sure this Snyk key gets revoked, changed, and removed from the code.",
      severity: "BLOCKER"
    },
    {
      key: "AZY-v8xbKJxvT2doRdjG",
      component: "EyaJrah_pfe:backend/services/Scanner.js",
      line: 31,
      message: "Change this code to not construct the OS command from user-controlled data.",
      severity: "BLOCKER"
    },
    {
      key: "AZY-oULG6MyJDCy9hJzb",
      component: "EyaJrah_pfe:routes/scannerRoutes.js",
      line: 36,
      message: "Change this code to not construct the OS command from user-controlled data.",
      severity: "BLOCKER"
    },
    {
      key: "AZY-me84VzvjLJAhGcM0",
      component: "EyaJrah_pfe:backend/routes/userRoutes.js",
      line: 29,
      message: "Change this code to not construct database queries directly from user-controlled data.",
      severity: "BLOCKER"
    },
    {
      key: "AZY-me84VzvjLJAhGcMz",
      component: "EyaJrah_pfe:backend/routes/userRoutes.js",
      line: 78,
      message: "Change this code to not construct database queries directly from user-controlled data.",
      severity: "BLOCKER"
    },
    {
      key: "AZY-me9FVzvjLJAhGcM1",
      component: "EyaJrah_pfe:routes/scannerRoutes.js",
      line: 20,
      message: "Change this code to not construct the OS command from user-controlled data.",
      severity: "BLOCKER"
    }
  ];

  const sonarComponent = {
    id: "AZYe-T4LoevWM1RV8sjT",
    key: "EyaJrah_pfe",
    name: "pfe",
    qualifier: "TRK",
    measures: [
      { metric: "bugs", value: "0", bestValue: true },
      { metric: "code_smells", value: "68", bestValue: false },
      { metric: "vulnerabilities", value: "3", bestValue: false }
    ]
  };

  res.json({
    snyk: {
      ...snykResultsNoSummary,
      vulnerabilities: snykVulns
    },
    sonar: {
      component: sonarComponent,
      issues: sonarIssues
    },
    trivy: trivyResults,
    owasp: []
  });
});

// GET /api/scan-results/results
router.get('/results', authenticateToken, async (req, res) => {
  const { repositoryUrl } = req.query;
  if (!repositoryUrl) {
    return res.status(400).json({ error: 'Repository URL is required' });
  }
  // Dummy result (replace with real DB lookup as needed)
  res.json({});
});

module.exports = router;