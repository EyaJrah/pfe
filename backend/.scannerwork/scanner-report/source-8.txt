require('dotenv').config();  // Charger les variables d'environnement depuis .env

const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const util = require('util');
const execAsync = util.promisify(exec);

// Configuration
const config = {
  sonarcloud: {
    organization: 'eyajrah',           // Votre organisation SonarCloud
    projectKey: 'EyaJrah_pfe',        // La clé de votre projet
    projectName: 'pfe',          // Le nom de votre projet
    token: process.env.SONAR_TOKEN    // Token d'accès SonarCloud
  },
  snyk: {
    token: process.env.SNYK_TOKEN     // Token d'accès Snyk
  }
};

// Fonction pour exécuter Trivy
async function runTrivy(projectPath) {
  console.log('\n=== Analyse Trivy ===');
  try {
    const { stdout } = await execAsync(`trivy fs ${projectPath}`);
    console.log('Résultats Trivy :', stdout);
  } catch (error) {
    console.error('Erreur Trivy:', error.message);
  }
}

// Fonction pour exécuter Snyk
async function runSnyk(projectPath) {
  console.log('\n=== Analyse Snyk ===');
  if (!config.snyk.token) {
    console.error('Token Snyk manquant. Définissez SNYK_TOKEN dans les variables d\'environnement.');
    return;
  }
  try {
    const { stdout } = await execAsync('snyk test', {
      cwd: projectPath,
      env: { ...process.env, SNYK_TOKEN: config.snyk.token }
    });
    console.log('Résultats Snyk :', stdout);
  } catch (error) {
    console.error('Erreur Snyk:', error.message);
  }
}

// Fonction pour exécuter OWASP Dependency Check
async function runOwaspDependencyCheck(projectPath) {
  console.log('\n=== Analyse OWASP Dependency Check ===');
  try {
    const outputPath = path.join(projectPath, 'owasp-report');
    await execAsync(
      `dependency-check.sh --scan ${projectPath} --format HTML --out ${outputPath}`,
      { cwd: projectPath }
    );
    console.log('Rapport OWASP généré dans:', outputPath);
  } catch (error) {
    console.error('Erreur OWASP:', error.message);
  }
}

// Fonction pour exécuter SonarCloud
async function runSonarCloud(projectPath) {
  console.log('\n=== Analyse SonarCloud ===');
  if (!config.sonarcloud.token) {
    console.error('Token SonarCloud manquant. Définissez SONAR_TOKEN dans les variables d\'environnement.');
    return;
  }
  try {
    // Création du fichier sonar-project.properties avec plus de paramètres
    const sonarProperties = `
sonar.organization=${config.sonarcloud.organization}
sonar.projectKey=${config.sonarcloud.projectKey}
sonar.projectName=${config.sonarcloud.projectName}
sonar.sources=.
sonar.host.url=https://sonarcloud.io
sonar.javascript.node.maxFileSize=8192
sonar.sourceEncoding=UTF-8
sonar.javascript.node.moduleResolution=node
sonar.verbose=true
    `.trim();
    
    fs.writeFileSync(path.join(projectPath, 'sonar-project.properties'), sonarProperties);
    
    // Exécution de l'analyse avec plus de détails
    console.log('Démarrage de l\'analyse SonarCloud...');
    console.log('Fichier sonar-project.properties créé avec succès');
    
    const { stdout, stderr } = await execAsync('sonar-scanner -X', {
      cwd: projectPath,
      env: { ...process.env, SONAR_TOKEN: config.sonarcloud.token }
    });
    
    console.log('Sortie SonarCloud:', stdout);
    if (stderr) {
      console.error('Erreurs SonarCloud:', stderr);
    }
  } catch (error) {
    console.error('Erreur SonarCloud:', error.message);
    if (error.stderr) {
      console.error('Détails de l\'erreur:', error.stderr);
    }
  }
}

// Fonction principale pour lancer toutes les analyses
async function analyzeProject(projectPath) {
  console.log('Début de l\'analyse du projet:', projectPath);
  
  // Vérifier si le chemin existe
  if (!fs.existsSync(projectPath)) {
    console.error('Le chemin du projet n\'existe pas:', projectPath);
    return;
  }

  // Exécuter chaque analyse
  await runSonarCloud(projectPath);
  await runTrivy(projectPath);
  await runSnyk(projectPath);
  await runOwaspDependencyCheck(projectPath);
  
  console.log('\nAnalyse terminée !');
}

// Si le script est exécuté directement
if (require.main === module) {
  // Utiliser le chemin fourni en argument ou le répertoire courant
  const projectPath = process.argv[2] || process.cwd();
  analyzeProject(projectPath).catch(console.error);
} 