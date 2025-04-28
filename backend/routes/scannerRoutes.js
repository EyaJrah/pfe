const express = require('express');
const router = express.Router();
const { rateLimit } = require('express-rate-limit');

// Initialize rate limiting for scan endpoints
const scanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many scan requests from this IP, please try again after 15 minutes'
});

// Route to get scan count
router.get('/count', async (req, res) => {
  try {
    const count = 0; // Replace with actual count from database
    res.json({ count });
  } catch (error) {
    console.error('Error getting scan count:', error);
    res.status(500).json({ error: 'Failed to get scan count' });
  }
});

// Route to get SonarCloud results
router.get('/sonarcloud/:projectKey', async (req, res) => {
  const { projectKey } = req.params;
  
  if (!projectKey) {
    return res.status(400).json({ error: 'Project key is required' });
  }

  try {
    // Mock response for now
    res.json({
      component: {
        id: "AZYe-T4LoevWM1RV8sjT",
        key: projectKey,
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
    });
  } catch (error) {
    console.error('Error fetching SonarCloud results:', error);
    res.status(500).json({ error: 'Failed to fetch SonarCloud results' });
  }
});

module.exports = router; 