require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const path = require('path');
const scanResults = require('./backend/routes/scanResults');
const userRoutes = require('./backend/routes/userRoutes');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/scan-results', scanResults);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start security scan
app.post('/api/scan', async (req, res) => {
  const { repositoryUrl } = req.body;
  
  if (!repositoryUrl) {
    return res.status(400).json({ error: 'Repository URL is required' });
  }

  try {
    // Execute security tools
    const results = await runSecurityTools(repositoryUrl);
    res.json(results);
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ error: 'Failed to complete security scan' });
  }
});

// Helper function to run security tools
async function runSecurityTools(repoUrl) {
  // Mock results for now - replace with actual tool execution
  return {
    overallScore: 85,
    totalVulnerabilities: 12,
    criticalIssues: 2,
    codeQuality: 92,
    securityScore: 88,
    snyk: {
      status: 'completed',
      metrics: {
        critical: 2,
        high: 3,
        medium: 4,
        low: 3
      },
      vulnerabilities: [
        {
          id: 'SNYK-123',
          title: 'SQL Injection Vulnerability',
          package: 'database@1.0.0',
          severity: 'critical',
          description: 'Potential SQL injection vulnerability in database queries'
        }
      ]
    },
    sonarcloud: {
      status: 'completed',
      projectKey: 'project-123',
      organization: 'org-456',
      metrics: {
        bugs: 5,
        codeSmells: 15,
        coverage: 85,
        duplications: 3
      },
      issues: [
        {
          rule: 'security-injection',
          component: 'src/database.js',
          severity: 'high',
          message: 'Potential SQL injection vulnerability detected'
        }
      ]
    },
    trivy: {
      status: 'completed',
      metrics: {
        critical: 1,
        high: 2,
        medium: 3,
        low: 2
      },
      vulnerabilities: [
        {
          target: 'Dockerfile',
          type: 'OS',
          vulnerabilityId: 'CVE-2023-1234',
          severity: 'critical',
          description: 'Critical vulnerability in base image'
        }
      ]
    },
    owasp: {
      status: 'completed',
      totalVulnerabilities: 8,
      metrics: {
        critical: 1,
        high: 2,
        medium: 3,
        low: 2
      },
      vulnerabilities: [
        {
          title: 'Outdated Dependency',
          severity: 'high',
          description: 'Using outdated version of package with known vulnerabilities',
          solution: 'Update to version 2.0.0 or later'
        }
      ]
    }
  };
}

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});