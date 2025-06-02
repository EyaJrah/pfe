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
console.log('🚀 NODE_ENV:', process.env.NODE_ENV);

// Set port for local development
const PORT = process.env.PORT || 5000;

// Apply Helmet middleware with local development settings
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://code.getmdl.io", "http://ajax.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:80", "http://localhost:5000", "http://www.checksec.loc", "https://api.github.com", "https://sonarcloud.io"]
    }
  }
}));

// Create temp directory if needed
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Configuration CORS dynamique (dev uniquement)
const allowedOrigins = [
  'http://localhost:80',
  'http://127.0.0.1:80',
  'http://localhost:5000',
  'http://localhost:5001',
  'http://www.checksec.loc',
  'http://localhost:4200'  // Added for Angular development server
];

// Log pour le débogage CORS
app.use((req, res, next) => {
  console.log('Request Headers:', req.headers);
  console.log('Request Origin:', req.headers.origin);
  console.log('Request Method:', req.method);
  next();
});

// Configuration CORS
app.use(cors({
  origin: function(origin, callback) {
    console.log('CORS Origin:', origin);
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked for origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Ajout d'un middleware pour logger les erreurs
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

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

// Serve static files from Angular build
const publicPath = path.join(__dirname, 'public');
console.log('Serving static files from:', publicPath);
if (!fs.existsSync(publicPath)) {
  console.error('Public directory not found at:', publicPath);
  console.log('Current directory contents:', fs.readdirSync(__dirname));
} else {
  console.log('Public directory contents:', fs.readdirSync(publicPath));
}
app.use(express.static(publicPath));

// Définition de la fonction handleScan
const handleScan = (req, res) => {
  const repoUrl = req.query.repoUrl;
  if (!repoUrl) return res.status(400).json({ error: 'repoUrl is required' });

  const scriptPath = path.join(__dirname, 'scan-and-send.sh');
  console.log('📝 Script path:', scriptPath);

  // Vérification si le script existe
  if (!fs.existsSync(scriptPath)) {
    console.error('❌ Script introuvable à :', scriptPath);
    return res.status(500).json({ error: 'Script scan-and-send.sh introuvable sur le serveur' });
  }

  // Set up environment with proper PATH
  const env = {
    ...process.env,
    PATH: [
      '/usr/local/bin',
      '/usr/local/sbin',
      '/usr/bin',
      '/usr/sbin',
      '/bin',
      '/sbin',
      process.env.PATH
    ].join(':')
  };

  // Exécution du script
  console.log('✅ Exécution du script avec repo :', repoUrl);
  const command = `bash "${scriptPath}" "${repoUrl}"`;
  console.log('🔧 Commande exécutée:', command);

  exec(command, { 
    maxBuffer: 1024 * 1024 * 50,
    env: env,
    timeout: 0 // No timeout
  }, (error, stdout, stderr) => {
    if (stderr) console.warn('⚠️ STDERR:', stderr);
    if (stdout) console.log('📄 STDOUT:', stdout);

    if (error) {
      console.error('❌ Erreur d\'exécution :', error.message);
      return res.status(500).json({ 
        error: 'Erreur script', 
        message: error.message, 
        stderr,
        command,
        scriptPath
      });
    }

    if (!stdout || typeof stdout !== 'string') {
      console.error('❌ Sortie vide ou invalide du script');
      return res.status(500).json({ error: 'Sortie vide ou invalide du script' });
    }

    const logPathMatch = stdout.match(/LOG_FILE_PATH:(.*)/);
    if (!logPathMatch) {
      console.error('❌ LOG_FILE_PATH non trouvé dans stdout');
      return res.status(500).json({ error: 'Chemin du fichier log introuvable', raw: stdout });
    }

    const logFilePath = logPathMatch[1].trim();
    console.log('📋 Log file path:', logFilePath);

    fs.readFile(logFilePath, 'utf8', (err, logContent) => {
      if (err) {
        console.error('❌ Lecture du fichier log échouée :', err.message);
        return res.status(500).json({ error: 'Erreur lecture fichier log', details: err.message });
      }

      // Extraction du dossier temporaire
      const tempDirMatch = logContent.match(/TEMP_DIR:(\/tmp\/tmp[^\s]+)/);
      let tempDir = tempDirMatch ? tempDirMatch[1] : null;

      if (!tempDir) {
        const tmpDirs = fs.readdirSync('/tmp').filter(f => f.startsWith('tmp'));
        if (tmpDirs.length > 0) {
          tempDir = '/tmp/' + tmpDirs.sort((a, b) => fs.statSync('/tmp/' + b).ctimeMs - fs.statSync('/tmp/' + a).ctimeMs)[0];
        }
      }

      if (!tempDir) {
        console.error('❌ Répertoire temporaire introuvable');
        return res.status(500).json({ error: 'Répertoire temporaire non trouvé', raw: logContent });
      }

      console.log('📁 Temp directory:', tempDir);

      const sonarcloud = safeReadJson(`${tempDir}/sonar_results.json`) || extractJsonBlock(stdout, 'Résultat SonarCloud');
      const trivy = safeReadJson(`${tempDir}/trivy.json`) || extractJsonBlock(stdout, 'Résultat Trivy');
      const snyk = safeReadJson(`${tempDir}/snyk.json`) || extractJsonBlock(stdout, 'Résultat Snyk');
      const owasp = safeReadJson(`${tempDir}/dc-report/dependency-check-report.json`) || extractJsonBlock(stdout, 'Résultat OWASP Dependency Check');

      limitVulns(sonarcloud, ['sonarcloud_vulnerabilities', 'issues'], 2);
      limitVulns(snyk, ['vulnerabilities'], 2);
      if (trivy?.Results) trivy.Results = trivy.Results.map(r => ({ ...r, Vulnerabilities: filterVulnFields((r.Vulnerabilities || []).slice(0, 2)) }));
      if (owasp?.dependencies) owasp.dependencies = owasp.dependencies.map(dep => ({ ...dep, vulnerabilities: filterVulnFields((dep.vulnerabilities || []).slice(0, 2)) }));

      // DEBUG lecture brute
      try {
        const trivyRaw = fs.readFileSync(`${tempDir}/trivy.json`, 'utf8');
        console.log('🟢 TRIVY RAW:', trivyRaw.slice(0, 1000));
      } catch (e) { console.log('🔴 Lecture Trivy échouée'); }

      try {
        const snykRaw = fs.readFileSync(`${tempDir}/snyk.json`, 'utf8');
        console.log('🟢 SNYK RAW:', snykRaw.slice(0, 1000));
      } catch (e) { console.log('🔴 Lecture Snyk échouée'); }

      // Mapping générique
      const mapSonarVuln = issue => ({
        id: issue.key || '',
        title: issue.rule || '',
        severity: issue.severity || '',
        description: issue.message || ''
      });

      const mapTrivyVuln = v => ({
        id: v.VulnerabilityID || v.id || '',
        title: v.Title || v.title || '',
        severity: v.Severity || v.severity || '',
        description: v.Description || v.description || ''
      });

      const mapSnykVuln = v => ({
        id: v.id || v.name || '',
        title: v.title || v.packageName || '',
        severity: v.severity || v.Severity || '',
        description: v.description || v.message || ''
      });

      const sonarVulns = sonarcloud?.sonarcloud_vulnerabilities?.issues?.slice(0, 2).map(mapSonarVuln) || [];

      const trivyVulns = [];
      if (trivy?.Results) {
        trivy.Results.forEach(r => {
          if (Array.isArray(r.Vulnerabilities)) {
            trivyVulns.push(...r.Vulnerabilities.slice(0, 2).map(mapTrivyVuln));
          }
        });
      }

      let snykVulns = [];
      if (Array.isArray(snyk)) {
        snyk.forEach(project => {
          if (project.vulnerabilities?.length) {
            snykVulns.push(...project.vulnerabilities.slice(0, 2).map(mapSnykVuln));
          }
        });
      } else if (snyk?.vulnerabilities?.length) {
        snykVulns = snyk.vulnerabilities.slice(0, 2).map(mapSnykVuln);
      }

      const owaspVulns = [];
      if (owasp?.dependencies) {
        owasp.dependencies.forEach(dep => {
          if (Array.isArray(dep.vulnerabilities)) {
            owaspVulns.push(...dep.vulnerabilities.slice(0, 2).map(mapSnykVuln));
          }
        });
      }

      console.log('✅ API FINAL RESPONSE');
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

// Ajout de la route run-script juste avant le catch-all
app.get('/api/run-script', handleScan);

// Handle Angular routing (catch-all)
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public/index.html');
  console.log('Serving index.html for path:', req.path);
  console.log('Index file path:', indexPath);
  if (!fs.existsSync(indexPath)) {
    console.error('index.html not found at:', indexPath);
    return res.status(404).send('Application not found');
  }
  res.sendFile(indexPath);
});

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

/*app.get('/api/run-script', handleScan);*/
app.get('/api/scan-and-send', handleScan);

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));