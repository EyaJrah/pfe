const express = require("express");
const router = express.Router();

router.get("/scan-results", async (req, res) => {
  const snykResults = {
    vulnerabilities: [],
    ok: true,
    dependencyCount: 287,
    summary: "No known vulnerabilities",
  };

  const sonarResults = {
    bugs: 0,
    vulnerabilities: 3,
    codeSmells: 68,
  };

  res.json({ snyk: snykResults, sonar: sonarResults });
});

module.exports = router;