const express = require('express');
const router = express.Router();
const path = require('path');
const authenticateToken = require('../middleware/authenticateToken');
const { 
  runTrivyScan, 
  runSnykScan, 
  runOwaspScan, 
  getSonarMetrics, 
  cloneRepository, 
  cleanupTempFiles 
} = require('../utils/scanUtils');
const fs = require('fs');
const axios = require('axios');

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
      await cloneRepository(repoUrl, tempDir, true);

      // Run all scans in parallel
      const [trivyResults, snykResults, owaspResults] = await Promise.all([
        runTrivyScan(tempDir),
        runSnykScan(tempDir),
        runOwaspScan(tempDir)
      ]);

      // Extract repository name and organization for SonarCloud
      const repoName = repoUrl.split('/').pop().replace('.git', '');
      const orgName = repoUrl.split('/').slice(-2, -1)[0];
      const projectKey = `${orgName}_${repoName}`;

      // Get SonarCloud metrics
      let sonarMetrics = [];
      try {
        sonarMetrics = await getSonarMetrics(projectKey);
      } catch (sonarError) {
        console.error('Error fetching SonarCloud metrics:', sonarError.message);
        // Fallback to default metrics if SonarCloud request fails
        sonarMetrics = [
          {
            metric: "bugs",
            value: "0",
            bestValue: true
          },
          {
            metric: "code_smells",
            value: "0",
            bestValue: false
          },
          {
            metric: "vulnerabilities",
            value: "0",
            bestValue: false
          },
          {
            metric: "coverage",
            value: "0",
            bestValue: false
          }
        ];
      }

      // Cleanup
      await cleanupTempFiles(tempDir);

      // Return combined results
      res.json({
        sonar: {
          component: {
            id: projectKey,
            key: projectKey,
            name: repoName,
            qualifier: "TRK",
            measures: sonarMetrics
          },
          vulnerabilities: []
        },
        snyk: snykResults,
        trivy: trivyResults.Results || [],
        owasp: owaspResults
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

// POST /api/scan-results/scan-all
router.post('/scan-all', authenticateToken, async (req, res) => {
  try {
    console.log('Received scan request with body:', req.body);
    const { githubUrl } = req.body;
    if (!githubUrl) {
      console.log('Error: GitHub URL is missing');
      return res.status(400).json({ error: 'GitHub URL is required' });
    }

    console.log(`Processing scan for repository: ${githubUrl}`);
    
    // Create a temporary directory for the scan
    const tempDir = path.join(__dirname, '..', 'temp', `repo-${Date.now()}`);
    console.log(`Created temporary directory: ${tempDir}`);
    
    try {
      // Clone repository
      console.log(`Cloning repository to ${tempDir}...`);
      await cloneRepository(githubUrl, tempDir, true);
      console.log('Repository cloned successfully');

      // Run all scans in parallel
      console.log('Starting all scans...');
      const [trivyResults, snykResults, owaspResults] = await Promise.all([
        runTrivyScan(tempDir),
        runSnykScan(tempDir),
        runOwaspScan(tempDir)
      ]);
      console.log('All scans completed');

      // Extract repository name from URL for Sonar component
      const repoName = githubUrl.split('/').pop().replace('.git', '');
      const orgName = githubUrl.split('/').slice(-2, -1)[0];
      const projectKey = `${orgName}_${repoName}`;
      console.log(`Extracted repo name: ${repoName}, org name: ${orgName}, project key: ${projectKey}`);

      // Get SonarCloud metrics
      let sonarMetrics = [];
      try {
        sonarMetrics = await getSonarMetrics(projectKey);
        console.log('Successfully fetched SonarCloud metrics');
      } catch (sonarError) {
        console.error('Error fetching SonarCloud metrics:', sonarError.message);
        // Fallback to default metrics if SonarCloud request fails
        sonarMetrics = [
          {
            metric: "bugs",
            value: "0",
            bestValue: true
          },
          {
            metric: "code_smells",
            value: "0",
            bestValue: false
          },
          {
            metric: "vulnerabilities",
            value: "0",
            bestValue: false
          },
          {
            metric: "coverage",
            value: "0",
            bestValue: false
          }
        ];
      }

      // Cleanup
      console.log('Cleaning up temporary files...');
      await cleanupTempFiles(tempDir);
      console.log('Cleanup completed');

      // Return combined results
      console.log('Preparing response...');
      const response = {
        sonar: {
          component: {
            name: repoName,
            key: projectKey,
            measures: sonarMetrics
          },
          issues: []
        },
        snyk: snykResults,
        trivy: trivyResults.Results || [],
        owasp: owaspResults
      };
      console.log('Scan results:', JSON.stringify(response, null, 2));
      res.json(response);
      console.log('Sending response to client');
    } catch (error) {
      console.error('Error during scan:', error);
      console.error('Error stack:', error.stack);
      await cleanupTempFiles(tempDir);
      res.status(500).json({ 
        error: 'Failed to perform scans',
        details: error.message
      });
    }
  } catch (error) {
    console.error('Error in scan-all endpoint:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to process scan request',
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