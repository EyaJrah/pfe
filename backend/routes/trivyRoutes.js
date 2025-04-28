const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const path = require('path');
const fs = require('fs').promises;
const { validateRepositoryUrl } = require('../utils/githubUtils');

// Helper function to run Trivy scan
async function runTrivyScan(repoPath) {
  try {
    const { stdout, stderr } = await execPromise(`trivy fs --format json ${repoPath}`);
    if (stderr) {
      console.error('Trivy scan warnings:', stderr);
    }
    return JSON.parse(stdout);
  } catch (error) {
    console.error('Error running Trivy scan:', error);
    throw error;
  }
}

// Helper function to cleanup temporary files
async function cleanupTempFiles(tempDir) {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.error('Error cleaning up temporary files:', error);
  }
}

// Route to run Trivy scan
router.post('/scan', async (req, res) => {
  console.log('Received scan request:', req.body);
  const { repositoryUrl } = req.body;
  
  if (!repositoryUrl) {
    return res.status(400).json({ error: 'Repository URL is required' });
  }

  // Create a temporary directory for the scan
  const tempDir = path.join(__dirname, '..', 'temp', `repo-${Date.now()}`);
  
  try {
    // Create temp directory if it doesn't exist
    await fs.mkdir(tempDir, { recursive: true });

    // Clone repository using git
    console.log('Cloning repository:', repositoryUrl);
    await execPromise(`git clone ${repositoryUrl} ${tempDir}`);

    // Run Trivy scan
    console.log('Running Trivy scan on:', tempDir);
    const scanResults = await runTrivyScan(tempDir);

    // Cleanup
    await cleanupTempFiles(tempDir);

    // Send results
    res.json(scanResults);
  } catch (error) {
    console.error('Error in Trivy scan:', error);
    // Cleanup on error
    await cleanupTempFiles(tempDir);
    res.status(500).json({ 
      error: 'Failed to run Trivy scan',
      details: error.message 
    });
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Trivy routes are working' });
});

module.exports = router; 