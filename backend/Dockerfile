FROM openjdk:21-jdk-bullseye

# Installer Node.js (version 20.x) sur Debian Bullseye
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Installer outils supplémentaires
RUN apt-get update && apt-get install -y git unzip jq wget && rm -rf /var/lib/apt/lists/*

# Installer Trivy
RUN curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# Installer Snyk
RUN npm install -g snyk

# Installer SonarScanner avec configuration SonarCloud
RUN wget https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-4.8.0.2856-linux.zip && \
    unzip sonar-scanner-cli-4.8.0.2856-linux.zip && \
    mv sonar-scanner-4.8.0.2856-linux /opt/sonar-scanner && \
    rm sonar-scanner-cli-4.8.0.2856-linux.zip && \
    echo "sonar.wrapper.javaOpts=-Xmx2048m -XX:ReservedCodeCacheSize=128m -Dfile.encoding=UTF-8" >> /opt/sonar-scanner/conf/sonar-scanner.properties && \
    mv /opt/sonar-scanner/bin/sonar-scanner /opt/sonar-scanner/bin/sonar-scanner.original && \
    echo '#!/bin/bash\n\
export JAVA_HOME=/usr/local/openjdk-21\n\
export PATH=$JAVA_HOME/bin:$PATH\n\
exec /opt/sonar-scanner/bin/sonar-scanner.original \
  -Dsonar.host.url=https://sonarcloud.io \
  -Dsonar.login=${SONAR_TOKEN} "$@"' > /opt/sonar-scanner/bin/sonar-scanner && \
    chmod +x /opt/sonar-scanner/bin/sonar-scanner

# Installer OWASP Dependency Check
RUN wget https://github.com/jeremylong/DependencyCheck/releases/download/v8.3.1/dependency-check-8.3.1-release.zip && \
    unzip dependency-check-8.3.1-release.zip -d /opt && \
    mv /opt/dependency-check /opt/dependency-check-8.3.1 && \
    ln -s /opt/dependency-check-8.3.1/bin/dependency-check.sh /usr/local/bin/dependency-check && \
    rm dependency-check-8.3.1-release.zip

ENV PATH="/opt/sonar-scanner/bin:/opt/dependency-check-8.3.1/bin:${PATH}"
ENV JAVA_HOME=/usr/local/openjdk-21
ENV PATH="$JAVA_HOME/bin:$PATH"
ENV JAVA_TOOL_OPTIONS="-Dfile.encoding=UTF-8"
ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /app

COPY package*.json ./
RUN npm install && npm cache clean --force

COPY . .

# Donner les permissions d'exécution aux scripts
RUN chmod +x scan-and-send.sh setup-sonar.sh setup-trivy.sh

# Créer le répertoire pour les rapports
RUN mkdir -p /tmp/dependency-check/dc-report

EXPOSE 5000

# Changer la commande de démarrage pour exécuter le script et le serveur
CMD ["/bin/sh", "-c", "cd /app && /app/scan-and-send.sh & node server.js"]
