export const environment = {
  production: false,
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
  },
  apiUrl: 'http://localhost:5000/api',
  securityTools: {
    sonarqube: {
      apiUrl: 'https://sonarcloud.io/api',
      token: '298d7357212881052db75cc289eb19e14284d9ce'
    },
    trivy: {
      apiUrl: 'http://localhost:8080/api'
    },
    snyk: {
      apiUrl: 'https://snyk.io/api/v1',
      token: '30901ddf-2cbe-45a3-b12b-c8f5c9b1115d',
      orgId: 'EyaJrah'
    },
    owasp: {
      apiUrl: 'http://localhost:8081/api'
    }
  }
};