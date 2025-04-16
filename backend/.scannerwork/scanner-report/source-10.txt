const express = require('express');
const router = express.Router();
const path = require('path');
const Scanner = require('../services/Scanner');

const scanner = new Scanner();

// Route pour scanner avec SonarQube
router.post('/sonarqube', async (req, res) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) {
      return res.status(400).json({ error: 'URL du repository requis' });
    }

    const tempDir = path.join(__dirname, '../temp');
    const { stdout, stderr } = await scanner.scan('sonarqube', repoUrl, tempDir);

    res.json({
      success: true,
      message: 'Scan SonarQube terminé avec succès',
      details: stdout,
      warnings: stderr
    });
  } catch (error) {
    console.error('Erreur SonarQube:', error);
    res.status(500).json({
      error: 'Erreur lors du scan SonarQube',
      details: error.message
    });
  }
});

// Route pour scanner avec Trivy
router.post('/trivy', async (req, res) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) {
      return res.status(400).json({ error: 'URL du repository requis' });
    }

    const tempDir = path.join(__dirname, '../temp');
    const { stdout, stderr } = await scanner.scan('trivy', repoUrl, tempDir);

    const results = JSON.parse(stdout);
    res.json({
      success: true,
      message: 'Scan Trivy terminé avec succès',
      results,
      warnings: stderr
    });
  } catch (error) {
    console.error('Erreur Trivy:', error);
    res.status(500).json({
      error: 'Erreur lors du scan Trivy',
      details: error.message
    });
  }
});

// Route pour scanner avec Snyk
router.post('/snyk', async (req, res) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) {
      return res.status(400).json({ error: 'URL du repository requis' });
    }

    const tempDir = path.join(__dirname, '../temp');
    const { stdout, stderr } = await scanner.scan('snyk', repoUrl, tempDir);

    const results = JSON.parse(stdout);
    res.json({
      success: true,
      message: 'Scan Snyk terminé avec succès',
      results,
      warnings: stderr
    });
  } catch (error) {
    console.error('Erreur Snyk:', error);
    res.status(500).json({
      error: 'Erreur lors du scan Snyk',
      details: error.message
    });
  }
});

// Route pour scanner avec OWASP Dependency Check
router.post('/owasp', async (req, res) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) {
      return res.status(400).json({ error: 'URL du repository requis' });
    }

    const tempDir = path.join(__dirname, '../temp');
    const { stdout, stderr, report } = await scanner.scan('owasp', repoUrl, tempDir);

    res.json({
      success: true,
      message: 'Scan OWASP Dependency Check terminé avec succès',
      report,
      warnings: stderr
    });
  } catch (error) {
    console.error('Erreur OWASP:', error);
    res.status(500).json({
      error: 'Erreur lors du scan OWASP Dependency Check',
      details: error.message
    });
  }
});

module.exports = router; 