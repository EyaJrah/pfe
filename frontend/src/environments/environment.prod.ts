export const environment = {
  production: true,
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
  },
  apiUrl: 'https://pfe-production-93c7.up.railway.app/api',
  securityTools: {
    sonarqube: {
      apiUrl: 'https://sonarcloud.io/api',
      token: '298d7357212881052db75cc289eb19e14284d9ce'
    },
    trivy: {
      apiUrl: 'https://pfe-production-93c7.up.railway.app/api/trivy'
    },
    snyk: {
      apiUrl: 'https://snyk.io/api/v1',
      token: '30901ddf-2cbe-45a3-b12b-c8f5c9b1115d',
      orgId: 'EyaJrah'
    },
    owasp: {
      apiUrl: 'https://pfe-production-93c7.up.railway.app/api/owasp'
    }
  }
}; 