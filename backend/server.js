// server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const { exec } = require('child_process');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Apply Helmet middleware
app.use(helmet());

// Create temp directory if needed
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  maxAge: 86400
};
app.use(cors(corsOptions));

// Logging requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB connection
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/pfe';
  
  // Log the connection attempt (sans mot de passe)
  const sanitizedUri = mongoUri.replace(/:([^:@]+)@/, ':****@');
  console.log('Tentative de connexion à MongoDB:', sanitizedUri);
  
  try {
    const conn = await mongoose.connect(mongoUri, {
      retryWrites: true,
      w: 'majority'
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Ne pas quitter le processus en production
    if (process.env.NODE_ENV === 'production') {
      console.error('Continuing despite MongoDB connection error');
    } else {
      process.exit(1);
    }
  }
};
connectDB();

// Routes
const userRoutes = require('./routes/userRoutes');
const scanResults = require('./routes/scanResults');

app.get('/', (req, res) => {
  res.json({ message: 'API is running...' });
});

app.use('/api/users', userRoutes);
app.use('/api/scan-results', scanResults);

// Helper functions
const safeReadJson = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.trim().length > 0) return JSON.parse(content);
    }
  } catch (_) {}
  return null;
};

const extractJsonBlock = (text, marker) => {
  const regex = new RegExp(`=== ${marker} ===\\s*([\\s\\S]*?)(?=^=== |$)`, 'm');
  const match = text.match(regex);
  if (match && match[1]) {
    const jsonCandidate = match[1].trim();
    try {
      return JSON.parse(jsonCandidate);
    } catch (_) {
      const first = jsonCandidate.indexOf('{');
      const last = jsonCandidate.lastIndexOf('}');
      if (first !== -1 && last > first) {
        try {
          return JSON.parse(jsonCandidate.slice(first, last + 1));
        } catch (_) {}
      }
    }
  }
  return null;
};

const limitVulns = (obj, path, max = 5) => {
  if (!obj) return obj;
  let ref = obj;
  for (let i = 0; i < path.length - 1; i++) {
    if (ref[path[i]]) {
      ref = ref[path[i]];
    } else {
      return obj;
    }
  }
  const lastKey = path[path.length - 1];
  if (Array.isArray(ref[lastKey])) {
    ref[lastKey] = ref[lastKey].slice(0, max);
  }
  return obj;
};

// Limiter à 2 vulnérabilités par outil et filtrer les champs essentiels
function filterVulnFields(vulns) {
  if (!Array.isArray(vulns)) return [];
  return vulns.map(v => ({
    id: v.id || v.VulnerabilityID || v.name || v.key || '',
    title: v.title || v.rule || v.packageName || v.component || '',
    severity: v.severity || v.Severity || '',
    description: v.description || v.message || ''
  }));
}

const handleScan = (req, res) => {
  const repoUrl = req.query.repoUrl;
  if (!repoUrl) return res.status(400).json({ error: 'repoUrl is required' });
  exec(`bash /home/thinkpad/Documents/pfe/scan-and-send.sh "${repoUrl}"`, { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
    if (error) return res.status(500).json({ error: error.message });

    const logPathMatch = stdout.match(/LOG_FILE_PATH:(.*)/);
    if (!logPathMatch) return res.status(500).json({ error: 'Log file path not found', raw: stdout });

    const logFilePath = logPathMatch[1].trim();
    fs.readFile(logFilePath, 'utf8', (err, logContent) => {
      if (err) return res.status(500).json({ error: 'Failed to read log', details: err.message });

      const tempDirMatch = logContent.match(/TEMP_DIR:(\/tmp\/tmp[^\s]+)/);
      let tempDir = tempDirMatch ? tempDirMatch[1] : null;

      if (!tempDir) {
        const tmpDirs = fs.readdirSync('/tmp').filter(f => f.startsWith('tmp'));
        if (tmpDirs.length > 0) {
          tempDir = '/tmp/' + tmpDirs.sort((a, b) => fs.statSync('/tmp/' + b).ctimeMs - fs.statSync('/tmp/' + a).ctimeMs)[0];
        }
      }
      if (!tempDir) return res.status(500).json({ error: 'Temp dir not found', raw: logContent });

      const sonarcloud = safeReadJson(`${tempDir}/sonar_results.json`) || extractJsonBlock(stdout, 'Résultat SonarCloud');
      const trivy = safeReadJson(`${tempDir}/trivy.json`) || extractJsonBlock(stdout, 'Résultat Trivy');
      const snyk = safeReadJson(`${tempDir}/snyk.json`) || extractJsonBlock(stdout, 'Résultat Snyk');
      const owasp = safeReadJson(`${tempDir}/dc-report/dependency-check-report.json`) || extractJsonBlock(stdout, 'Résultat OWASP Dependency Check');

      limitVulns(sonarcloud, ['sonarcloud_vulnerabilities', 'issues'], 2);
      limitVulns(snyk, ['vulnerabilities'], 2);
      if (trivy?.Results) trivy.Results = trivy.Results.map(r => ({ ...r, Vulnerabilities: filterVulnFields((r.Vulnerabilities || []).slice(0, 2)) }));
      if (owasp?.dependencies) owasp.dependencies = owasp.dependencies.map(dep => ({ ...dep, vulnerabilities: filterVulnFields((dep.vulnerabilities || []).slice(0, 2)) }));

      // DEBUG: Log du contenu brut des fichiers Trivy et Snyk
      try {
        const trivyRaw = fs.readFileSync(`${tempDir}/trivy.json`, 'utf8');
        console.log('TRIVY RAW JSON:', trivyRaw);
      } catch (e) { console.log('TRIVY RAW JSON: ERREUR LECTURE'); }
      try {
        const snykRaw = fs.readFileSync(`${tempDir}/snyk.json`, 'utf8');
        console.log('SNYK RAW JSON:', snykRaw);
      } catch (e) { console.log('SNYK RAW JSON: ERREUR LECTURE'); }

      // Mapping spécifique pour chaque outil
      function mapSonarVuln(issue) {
        return {
          id: issue.key || '',
          title: issue.rule || '',
          severity: issue.severity || '',
          description: issue.message || ''
        };
      }
      function mapTrivyVuln(v) {
        return {
          id: v.VulnerabilityID || v.id || '',
          title: v.Title || v.title || '',
          severity: v.Severity || v.severity || '',
          description: v.Description || v.description || ''
        };
      }
      function mapSnykVuln(v) {
        return {
          id: v.id || v.name || '',
          title: v.title || v.packageName || '',
          severity: v.severity || v.Severity || '',
          description: v.description || v.message || ''
        };
      }
      // SonarCloud
      let sonarVulns = [];
      if (sonarcloud?.sonarcloud_vulnerabilities?.issues) {
        sonarVulns = sonarcloud.sonarcloud_vulnerabilities.issues.slice(0, 2).map(mapSonarVuln);
      }
      // Trivy
      let trivyVulns = [];
      if (trivy?.Results) {
        trivy.Results.forEach(r => {
          if (Array.isArray(r.Vulnerabilities) && r.Vulnerabilities.length > 0) {
            trivyVulns.push(...r.Vulnerabilities.slice(0, 2).map(mapTrivyVuln));
          }
        });
      }
      // Snyk (support multi-projets)
      let snykVulns = [];
      if (Array.isArray(snyk)) {
        snyk.forEach(project => {
          if (Array.isArray(project.vulnerabilities) && project.vulnerabilities.length > 0) {
            snykVulns.push(...project.vulnerabilities.slice(0, 2).map(mapSnykVuln));
          }
        });
      } else if (snyk?.vulnerabilities) {
        snykVulns = snyk.vulnerabilities.slice(0, 2).map(mapSnykVuln);
      }
      // OWASP
      let owaspVulns = [];
      if (owasp?.dependencies) {
        owasp.dependencies.forEach(dep => {
          if (Array.isArray(dep.vulnerabilities)) {
            owaspVulns.push(...dep.vulnerabilities.slice(0, 2).map(mapSnykVuln));
          }
        });
      }
      // Log de la réponse API pour debug
      console.log('API response:', { sonarcloud, trivy, snyk, owasp });
      console.log('DEBUG SNYK typeof:', typeof snyk, Array.isArray(snyk) ? 'array' : 'object');
      console.log('DEBUG SNYK (truncated):', JSON.stringify(snyk).slice(0, 1000));
      console.log('DEBUG SNYK VULNS:', snykVulns);
      res.json({
        sonarcloud,
        sonarcloudVulns: sonarVulns,
        sonarcloudMetrics: sonarcloud?.sonarcloud_metrics || {},
        trivy,
        trivyVulns,
        snyk,
        snykVulns,
        owasp,
        owaspVulns
      });
    });
  });
};

app.get('/api/run-script', handleScan);
app.get('/api/scan-and-send', handleScan);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Handle Angular routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});
