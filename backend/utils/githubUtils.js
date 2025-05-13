/**
 * Validates if a string is a valid GitHub repository URL
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if the URL is a valid GitHub repository URL
 */
function validateRepositoryUrl(url) {
  if (!url) return false;
  
  // Check if it's a GitHub URL
  const githubRegex = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w-]+(\/)?$/;
  return githubRegex.test(url);
}

/**
 * Extracts the project key from a GitHub repository URL
 * @param {string} url - The GitHub repository URL
 * @returns {string} - The project key (username_repository)
 */
function extractProjectKey(url) {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(part => part);
    
    if (pathParts.length >= 2) {
      return `${pathParts[0]}_${pathParts[1]}`;
    }
    
    return '';
  } catch (error) {
    console.error('Error extracting project key:', error);
    return '';
  }
}

module.exports = {
  validateRepositoryUrl,
  extractProjectKey
}; 