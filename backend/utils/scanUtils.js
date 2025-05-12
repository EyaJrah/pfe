const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");
const { validateRepositoryUrl } = require('../utils/githubUtils');
const fsExtra = require('fs-extra');
const simpleGit = require('simple-git');
const { v4: uuidv4 } = require('uuid');

async function runTrivyScan(repoPath) {
  try {
    console.log('Starting Trivy scan on:', repoPath);
    const { stdout } = await execPromise(
      `trivy fs ${repoPath} --cache-dir ~/.cache/trivy --scanners vuln,secret --include-dev-deps --severity LOW,MEDIUM,HIGH,CRITICAL --format json --timeout 10m`,
      { 
        timeout: parseInt(process.env.TRIVY_TIMEOUT) || 600000,
        maxBuffer: 1024 * 1024 * 50 // 50MB buffer
      }
    );
    console.log('Trivy scan completed');
    const results = JSON.parse(stdout);
    return results;
  } catch (error) {
    console.error('Error running Trivy scan:', error);
    return { Results: [], error: error.message, scanStatus: 'failed' };
  }
}

// Fonction pour authentifier Snyk
async function authenticateSnyk() {
  try {
    console.log('Authenticating Snyk...');
    const snykToken = process.env.SNYK_TOKEN;
    if (!snykToken) {
      console.warn('SNYK_TOKEN not found in environment variables');
      return false;
    }

    // Vérifier si Snyk est déjà authentifié
    const { stdout: authStatus } = await execPromise('snyk auth status');
    if (authStatus.includes('authenticated')) {
      console.log('Snyk is already authenticated');
      return true;
    }

    // Authentifier Snyk avec le token
    await execPromise(`snyk auth ${snykToken}`);
    console.log('Snyk authenticated successfully');
    return true;
  } catch (error) {
    console.error('Error authenticating Snyk:', error);
    return false;
  }
}

async function runSnykScan(repoPath) {
  try {
    console.log('Starting Snyk scan on:', repoPath);
    
    // Vérifier si le token est présent
    if (!process.env.SNYK_TOKEN) {
      console.warn('SNYK_TOKEN not found in environment variables');
      return { vulnerabilities: [], error: 'SNYK_TOKEN not configured', scanStatus: 'failed' };
    }

    // Configurer Snyk avec le token
    await execPromise(`snyk config set api=${process.env.SNYK_TOKEN}`);
    console.log('Snyk configured with token');
    
    console.log('Snyk version:', await execPromise('snyk --version'));
    
    const { stdout, stderr } = await execPromise(
      `snyk test --org=${process.env.SNYK_ORG_ID} --json || true`,
      { 
        cwd: repoPath,
        timeout: parseInt(process.env.SNYK_TIMEOUT) || 600000,
        env: { ...process.env, SNYK_TOKEN: process.env.SNYK_TOKEN },
        maxBuffer: 1024 * 1024 * 50 // 50MB buffer
      }
    );
    
    console.log('Snyk scan completed');
    if (stderr) console.log('Snyk stderr:', stderr);
    
    try {
      const result = JSON.parse(stdout);
      console.log('Snyk found', result.vulnerabilities?.length || 0, 'vulnerabilities');
      return result;
    } catch (parseError) {
      console.log('Snyk returned non-JSON output:', stdout);
      return { vulnerabilities: [], message: 'No supported files found for Snyk analysis' };
    }
  } catch (error) {
    console.error('Error running Snyk scan:', error);
    if (error.stdout) console.error('Snyk stdout:', error.stdout);
    if (error.stderr) console.error('Snyk stderr:', error.stderr);
    
    // Si l'erreur est due à l'absence de token, retourner un résultat vide
    if (error.stderr && error.stderr.includes('authentication')) {
      console.warn('Snyk authentication error. Please configure SNYK_TOKEN.');
      return { vulnerabilities: [], error: 'Authentication required. Please configure SNYK_TOKEN.' };
    }
    
    return { vulnerabilities: [], error: error.message, scanStatus: 'failed' };
  }
}

async function runOwaspScan(repoPath) {
  try {
    console.log('Starting OWASP scan on:', repoPath);
    const reportPath = path.join(repoPath, 'dc-report.json');
    await execPromise(
      `dependency-check.sh --project "ScanProject" --scan ${repoPath} --format JSON --out ${reportPath} --suppression ${path.join(__dirname, '..', 'config', 'suppressions.xml')}`,
      { 
        timeout: parseInt(process.env.OWASP_TIMEOUT) || 1200000,
        maxBuffer: 1024 * 1024 * 50 // 50MB buffer
      }
    );
    const report = await fs.readFile(reportPath, 'utf8');
    await fs.unlink(reportPath);
    return JSON.parse(report);
  } catch (error) {
    console.error('Error running OWASP scan:', error);
    return { dependencies: [], error: error.message, scanStatus: 'failed' };
  }
}

async function createSonarProject(projectKey, projectName) {
  try {
    console.log('Creating SonarCloud project:', projectKey);
    console.log('Using SonarCloud token:', process.env.SONAR_TOKEN ? 'Token exists' : 'No token');
    console.log('Using organization:', process.env.SONAR_ORG_KEY);
    
    // Vérifier d'abord si l'organisation existe
    const { stdout: orgCheck } = await execPromise(
      `curl -s -u "${process.env.SONAR_TOKEN}:" "https://sonarcloud.io/api/organizations/search"`,
      { 
        timeout: parseInt(process.env.SONAR_TIMEOUT) || 30000,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      }
    );

    console.log('SonarCloud organizations response:', orgCheck);
    const orgs = JSON.parse(orgCheck);
    if (!orgs.organizations || orgs.organizations.length === 0) {
      console.log('No organizations found. Using default organization.');
      return { project: { key: projectKey } };
    }

    // Utiliser la première organisation disponible
    const orgKey = orgs.organizations[0].key;
    console.log('Using organization:', orgKey);

    // Créer le projet avec l'organisation trouvée
    const { stdout, stderr } = await execPromise(
      `curl -X POST "https://sonarcloud.io/api/projects/create" -u "${process.env.SONAR_TOKEN}:" -d "name=${projectName}" -d "project=${projectKey}" -d "organization=${orgKey}"`,
      { 
        timeout: parseInt(process.env.SONAR_TIMEOUT) || 30000,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      }
    );
    
    console.log('SonarCloud project creation response:', stdout);
    if (stderr) console.log('SonarCloud stderr:', stderr);
    
    try {
      const response = JSON.parse(stdout);
      console.log('SonarCloud project created:', response);
      return response;
    } catch (parseError) {
      console.error('Error parsing SonarCloud response:', parseError);
      return { project: { key: projectKey } };
    }
  } catch (error) {
    if (error.stdout && error.stdout.includes('already exists')) {
      console.log('Project already exists in SonarCloud');
      return { project: { key: projectKey } };
    }
    console.error('Error creating SonarCloud project:', error);
    if (error.stdout) console.error('SonarCloud stdout:', error.stdout);
    if (error.stderr) console.error('SonarCloud stderr:', error.stderr);
    return { project: { key: projectKey } };
  }
}

async function getSonarMetrics(projectKey) {
  try {
    console.log('Fetching SonarCloud metrics for:', projectKey);
    const response = await axios.get(
      `https://sonarcloud.io/api/measures/component?component=${projectKey}&metricKeys=bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density,ncloc,complexity`,
      {
        auth: {
          username: process.env.SONAR_TOKEN,
          password: ''
        },
        timeout: parseInt(process.env.SONAR_TIMEOUT) || 10000
      }
    );
    return response.data.component.measures;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log('Project not found in SonarCloud, creating it...');
      try {
        await createSonarProject(projectKey, projectKey.split('_').join(' '));
        return []; // Return empty metrics for new project
      } catch (createError) {
        console.error('Failed to create SonarCloud project:', createError.message);
        return []; // Return empty metrics if creation fails
      }
    }
    console.error('Error fetching SonarCloud metrics:', error.message);
    return []; // Return empty metrics if fetch fails
  }
}

async function cloneRepository(repoUrl, tempDir, shallow = true) {
  try {
    console.log('Creating directory:', tempDir);
    await fs.mkdir(tempDir, { recursive: true });
    console.log('Cloning repository:', repoUrl);
    
    // Cloner le dépôt
    const cloneCommand = shallow ? 
      `git clone --depth 1 --single-branch ${repoUrl} ${tempDir}` : 
      `git clone ${repoUrl} ${tempDir}`;
    await execPromise(cloneCommand, { 
      timeout: 300000,
      maxBuffer: 1024 * 1024 * 50 // 50MB buffer
    });
    console.log('Repository cloned successfully');

    // Installer les dépendances npm si package.json existe
    const packageJsonPath = path.join(tempDir, 'package.json');
    try {
      await fs.access(packageJsonPath);
      console.log('package.json found, running npm install...');
      await execPromise('npm install', { 
        cwd: tempDir,
        timeout: 300000,
        maxBuffer: 1024 * 1024 * 100 // 100MB buffer
      });
      console.log('npm install completed successfully');
    } catch (error) {
      console.log('No package.json found or npm install failed:', error.message);
    }

    return true;
  } catch (error) {
    console.error('Error cloning repository:', error);
    throw error;
  }
}

async function cleanupTempFiles(tempDir) {
  try {
    console.log('Cleaning up:', tempDir);
    await fs.rm(tempDir, { recursive: true, force: true });
    console.log('Cleanup completed');
  } catch (error) {
    console.error('Error cleaning up temporary files:', error);
  }
}

async function runSonarCloudScan(repoUrl, orgKey, sonarToken) {
  const tempDir = path.join(__dirname, '..', 'temp', uuidv4());
  try {
    // 1. Cloner le repo
    await simpleGit().clone(repoUrl, tempDir);

    // 2. Générer sonar-project.properties
    const repoName = repoUrl.split('/').pop().replace('.git', '');
    const projectKey = `${orgKey}_${repoName}`;
    const sonarProps = `
sonar.projectKey=${projectKey}
sonar.organization=${orgKey}
sonar.projectName=${repoName}
sonar.sources=src
sonar.sourceEncoding=UTF-8
sonar.login=${sonarToken}
    `.trim();
    await fsExtra.writeFile(path.join(tempDir, 'sonar-project.properties'), sonarProps);

    // 3. Lancer sonar-scanner
    await new Promise((resolve, reject) => {
      exec(
        `sonar-scanner`,
        { cwd: tempDir, maxBuffer: 1024 * 1024 * 10 },
        (error, stdout, stderr) => {
          if (error) return reject(stderr || stdout);
          resolve(stdout);
        }
      );
    });

    // 4. (Optionnel) Récupérer les résultats SonarCloud via l'API ici

    return { status: 'Scan SonarCloud terminé', projectKey };
  } finally {
    await fsExtra.remove(tempDir);
  }
}

module.exports = {
  runTrivyScan,
  runSnykScan,
  runOwaspScan,
  getSonarMetrics,
  cloneRepository,
  cleanupTempFiles,
  authenticateSnyk,
  runSonarCloudScan
};
