# Étape 1 : build Angular
FROM node:18 AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ .
RUN npm run build

# Étape 2 : build backend
FROM node:18
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/ . 
COPY backend/scan-and-send.sh ./
RUN chmod +x /app/scan-and-send.sh


# Installer les outils nécessaires pour les scans
RUN apt-get update && \
    apt-get install -y openjdk-17-jre git curl unzip && \
    npm install -g snyk && \
    curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin && \
    npm install -g sonarqube-scanner && \
    curl -sSLo /tmp/dc.zip https://github.com/dependency-check/DependencyCheck/releases/download/v12.1.0/dependency-check-12.1.0-release.zip && \
    test -s /tmp/dc.zip && \
    unzip /tmp/dc.zip -d /opt && \
    mv /opt/dependency-check /opt/dependency-check-12.1.0 && \
    ln -s /opt/dependency-check-12.1.0/bin/dependency-check.sh /usr/local/bin/dependency-check && \
    rm /tmp/dc.zip
# Copie les fichiers Angular compilés
COPY --from=frontend-build /app/dist/temp-app/browser/ ./public/

# Expose le port
EXPOSE 5000

# Démarre le serveur
CMD ["node", "server.js"]
