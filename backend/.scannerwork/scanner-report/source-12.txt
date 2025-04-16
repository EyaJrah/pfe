const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const execAsync = promisify(exec);

class Scanner {
  constructor() {
    this.SONAR_TOKEN = process.env.SONAR_TOKEN;
    this.SNYK_TOKEN = process.env.SNYK_TOKEN;
    this.OWASP_PATH = process.env.OWASP_PATH || './dependency-check';
    this.TRIVY_PATH = process.env.TRIVY_PATH || 'trivy';
  }

  validateGitUrl(url) {
    const gitUrlPattern = /^https:\/\/[a-zA-Z0-9\-_.]+\/[a-zA-Z0-9\-_.]+\/[a-zA-Z0-9\-_.]+\.git$/;
    if (!gitUrlPattern.test(url)) {
      throw new Error('URL de repository invalide');
    }
    return url;
  }

  async cloneRepository(repoUrl, basePath) {
    const validatedUrl = this.validateGitUrl(repoUrl);
    const repoName = validatedUrl.split('/').pop().replace('.git', '');
    const clonePath = path.join(basePath, repoName);

    console.log(`Cloning repository ${validatedUrl} to ${clonePath}`);
    
    try {
      await execAsync(`git clone ${validatedUrl} ${clonePath}`, {
        shell: '/bin/bash',
        cwd: process.cwd(),
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
      });
      return { clonePath, repoName };
    } catch (error) {
      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }

  async cleanupDirectory(directory) {
    if (!directory) return;
    console.log(`Cleaning up directory ${directory}`);
    try {
      await execAsync(`rm -rf ${directory}`, {
        shell: '/bin/bash',
        cwd: process.cwd()
      });
    } catch (error) {
      console.error(`Error cleaning up directory: ${error.message}`);
    }
  }

  async runSonarQube(clonePath, repoName) {
    const sonarProperties = `
      sonar.projectKey=${repoName}
      sonar.sources=.
      sonar.host.url=${process.env.SONAR_HOST_URL}
      sonar.login=${this.SONAR_TOKEN}
    `;

    const propertiesPath = path.join(clonePath, 'sonar-project.properties');
    fs.writeFileSync(propertiesPath, sonarProperties);

    const { stdout, stderr } = await execAsync(
      `sonar-scanner -Dsonar.projectBaseDir=${clonePath}`,
      { shell: '/bin/bash', cwd: clonePath }
    );

    return { stdout, stderr };
  }

  async runTrivy(clonePath) {
    const { stdout, stderr } = await execAsync(
      `${this.TRIVY_PATH} fs ${clonePath} --format json`,
      { shell: '/bin/bash', cwd: process.cwd() }
    );
    return { stdout, stderr };
  }

  async runSnyk(clonePath) {
    const { stdout, stderr } = await execAsync(
      `snyk test --json`,
      {
        shell: '/bin/bash',
        cwd: clonePath,
        env: { ...process.env, SNYK_TOKEN: this.SNYK_TOKEN }
      }
    );
    return { stdout, stderr };
  }

  async runOWASP(clonePath) {
    const owaspScript = path.join(this.OWASP_PATH, 'bin', 'dependency-check.sh');
    if (!fs.existsSync(owaspScript)) {
      throw new Error(`OWASP Dependency Check script not found at ${owaspScript}`);
    }

    const reportPath = path.join(clonePath, 'report.json');
    const { stdout, stderr } = await execAsync(
      `${owaspScript} --scan ${clonePath} --format JSON --out ${reportPath}`,
      { shell: '/bin/bash', cwd: process.cwd() }
    );

    if (!fs.existsSync(reportPath)) {
      throw new Error('OWASP report not generated');
    }

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    return { stdout, stderr, report };
  }

  async scan(type, repoUrl, tempDir) {
    let clonePath = null;
    try {
      const { clonePath: path, repoName } = await this.cloneRepository(repoUrl, tempDir);
      clonePath = path;

      let result;
      switch (type.toLowerCase()) {
        case 'sonarqube':
          result = await this.runSonarQube(clonePath, repoName);
          break;
        case 'trivy':
          result = await this.runTrivy(clonePath);
          break;
        case 'snyk':
          result = await this.runSnyk(clonePath);
          break;
        case 'owasp':
          result = await this.runOWASP(clonePath);
          break;
        default:
          throw new Error(`Scanner type '${type}' not supported`);
      }

      return result;
    } finally {
      await this.cleanupDirectory(clonePath);
    }
  }
}

module.exports = Scanner; 