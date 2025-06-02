#!/bin/bash
# Script d'analyse SonarCloud pour projet Node.js
# Usage: ./setup-sonar.sh <repo_path> <project_key> <sonar_sources>

REPO_PATH="$1"
PROJECT_KEY="$2"
SONAR_SOURCES="$3"
SONAR_TOKEN="fca5ededf16ddf55a1c9c675601907dd81231296"
SONAR_ORG="eyajrah"
SONAR_HOST="https://sonarcloud.io"

if [ -z "$REPO_PATH" ] || [ -z "$PROJECT_KEY" ] || [ -z "$SONAR_SOURCES" ]; then
  echo "Usage: $0 <repo_path> <project_key> <sonar_sources>" >&2
  exit 1
fi

cd "$REPO_PATH" || exit 1
# Installe sonar-scanner si besoin (npm global ou local)
if ! command -v sonar-scanner &> /dev/null; then
  if [ -f "node_modules/.bin/sonar-scanner" ]; then
    SCANNER="node_modules/.bin/sonar-scanner"
  else
    echo "sonar-scanner n'est pas installé. Installe-le avec 'npm install -g sonar-scanner' ou localement dans le projet." >&2
    exit 1
  fi
else
  SCANNER="sonar-scanner"
fi

# Configurer Java 21
export JAVA_HOME="/usr/local/openjdk-21"
export PATH="${JAVA_HOME}/bin:${PATH}"



$SCANNER \
  -Dsonar.projectKey="$PROJECT_KEY" \
  -Dsonar.organization="$SONAR_ORG" \
  -Dsonar.sources="$SONAR_SOURCES" \
  -Dsonar.host.url="$SONAR_HOST" \
  -Dsonar.login="$SONAR_TOKEN"
