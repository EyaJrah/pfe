# Étape 1 : Build Angular frontend
FROM node:18 AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ .
RUN npm run build

# Étape 2 : Build backend + outils de scan
FROM node:18

# Installer dépendances système et outils de scan
RUN apt-get update && apt-get install -y \
    openjdk-17-jre \
    git \
    curl \
    unzip \
    jq \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Trivy
RUN curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# Snyk
RUN npm install -g snyk

# SonarScanner
RUN wget https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-4.8.0.2856-linux.zip \
    && unzip sonar-scanner-cli-4.8.0.2856-linux.zip \
    && mv sonar-scanner-4.8.0.2856-linux /opt/sonar-scanner \
    && rm sonar-scanner-cli-4.8.0.2856-linux.zip

# OWASP Dependency Check
RUN wget https://github.com/jeremylong/DependencyCheck/releases/download/v12.1.0/dependency-check-12.1.0-release.zip \
    && unzip dependency-check-12.1.0-release.zip -d /opt \
    && mv /opt/dependency-check /opt/dependency-check-12.1.0 \
    && ln -s /opt/dependency-check-12.1.0/bin/dependency-check.sh /usr/local/bin/dependency-check \
    && rm dependency-check-12.1.0-release.zip

# Définir les PATHs
ENV PATH="/opt/sonar-scanner/bin:/opt/dependency-check-12.1.0/bin:${PATH}"

# Créer le répertoire de travail backend
WORKDIR /app

# Copier et installer backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ .

# Copier scripts et rendre exécutables
COPY backend/scan-and-send.sh ./
COPY backend/setup-sonar.sh ./
COPY backend/setup-trivy.sh ./
RUN chmod +x scan-and-send.sh setup-sonar.sh setup-trivy.sh

# Copier le frontend compilé depuis l'étape précédente
COPY --from=frontend-build /app/dist/temp-app/browser/ ./public/

# Exposer le port du backend
EXPOSE 5000

# Démarrer le backend
CMD ["node", "server.js"]

