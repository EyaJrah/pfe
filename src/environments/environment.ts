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
        token: 'b718bebe69ae25aad26749217b703380e104439a'
      },
      trivy: {
        apiUrl: 'http://localhost:8080/api'
      },
      snyk: {
        apiUrl: 'https://snyk.io/api/v1',
        token: '912bed2b-e9f1-4b9c-b110-14843eca81cb',
        orgId: 'EyaJrah'
      },
      owasp: {
        apiUrl: 'http://localhost:8081/api'
      }
    }
  };
  