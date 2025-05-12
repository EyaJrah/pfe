/**
 * Validates that all required environment variables are set
 * @param {string[]} requiredVars - Array of required environment variable names
 * @throws {Error} - Throws an error if any required variable is missing
 */
function validateEnvVariables(requiredVars) {
  const missingVars = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

module.exports = {
  validateEnvVariables
}; 