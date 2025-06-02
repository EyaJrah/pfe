#!/bin/bash

# Générer un nom de fichier log temporaire unique
LOG_FILE="/tmp/resultats-complets-$(date +%s)-$$.log"

# Rediriger toute la sortie (stdout et stderr) vers le fichier log
exec > >(tee -a "$LOG_FILE") 2>&1


TEMP_DIR=$(mktemp -d)
echo "TEMP_DIR:$TEMP_DIR"

# Nettoyage automatique à la fin du script (même en cas d'erreur)
cleanup() {
  rm -rf "$TEMP_DIR"
  rm -rf "$REPO_NAME"
}
#trap cleanup EXIT

# Function to handle Snyk authentication
handle_snyk_auth() {
    if [ -n "$SNYK_TOKEN" ]; then
        snyk config set api=$SNYK_TOKEN
    fi
    if ! snyk auth $SNYK_TOKEN &> /dev/null; then
        echo "SNYK_TOKEN:$SNYK_TOKEN"
        echo "Erreur: Snyk n'est pas authentifié"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    echo "Vérification des prérequis..."
    
    # Vérifier Trivy
    if ! command -v trivy &> /dev/null; then
        echo "Erreur: Trivy n'est pas installé"
        exit 1
    fi
    
  
    # Vérifier Snyk
    if ! command -v snyk &> /dev/null; then
        echo "Erreur: Snyk n'est pas installé"
        exit 1
    fi
    
    # Vérifier Dependency-Check
    if ! command -v dependency-check &> /dev/null; then
        echo "Erreur: Dependency-Check n'est pas installé"
        exit 1
    fi
    
    # Vérifier SonarScanner
    if ! command -v sonar-scanner &> /dev/null; then
        echo "Erreur: SonarScanner n'est pas installé"
        exit 1
    fi
    
    mkdir -p ~/.cache/trivy
    handle_snyk_auth
    echo "Tous les prérequis sont satisfaits"
}

# Check if repository URL is provided
if [ $# -lt 1 ]; then
    exit 1
fi

# Clone the repository
REPO_URL=$1
REPO_NAME=$(basename $REPO_URL .git)
ORGANIZATION="eyajrah"

# Charger les variables d'environnement depuis .env si présent
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Vérification du token SonarCloud
if [ -z "$SONAR_TOKEN" ]; then
  echo "Erreur : SONAR_TOKEN n'est pas défini dans .env" >&2
  exit 1
fi

# Détermination du PROJECT_KEY et des sources
if [ -f "$REPO_NAME/sonar-project.properties" ]; then
  PROJECT_KEY=$(grep '^sonar.projectKey=' "$REPO_NAME/sonar-project.properties" | cut -d'=' -f2)
else
  PROJECT_KEY="${ORGANIZATION}_${REPO_NAME}"
fi

if [ -n "$3" ]; then
  SONAR_SOURCES="$3"
elif [ -n "$SONAR_SOURCES" ]; then
  SONAR_SOURCES="$SONAR_SOURCES"
else
  SONAR_SOURCES="."
fi

# Nettoyage du dossier existant avant clonage
if [ -d "$REPO_NAME" ]; then
  echo "Suppression du dossier existant $REPO_NAME"
  rm -rf "$REPO_NAME"
fi

echo "Répertoire courant: $(pwd)"
git clone "$REPO_URL"
if [ ! -d "$REPO_NAME" ]; then
    exit 1
fi

# Après le clonage du repo, installer les dépendances Node.js si package.json existe
if [ -f "$REPO_NAME/package.json" ]; then
    (cd "$REPO_NAME" && npm install &> /dev/null)
fi

# Après le clonage du repo, générer automatiquement sonar-project.properties si absent
SONAR_PROPS_PATH="$REPO_NAME/sonar-project.properties"
if [ ! -f "$SONAR_PROPS_PATH" ]; then
  echo "Génération automatique de $SONAR_PROPS_PATH"
  cat > "$SONAR_PROPS_PATH" <<EOF
sonar.projectKey=eyajrah_${REPO_NAME}
sonar.organization=eyajrah
sonar.host.url=https://sonarcloud.io
sonar.sources=.
sonar.sourceEncoding=UTF-8
EOF
fi

# Lancer l'analyse SonarCloud via setup-sonar.sh si présent, sinon sonar-scanner direct
SONAR_SCRIPT_PATH="$(dirname "$0")/setup-sonar.sh"
if [ -f "$REPO_NAME/sonar-project.properties" ]; then
  if [ -f "$SONAR_SCRIPT_PATH" ]; then
    echo "[DEBUG] Lancement setup-sonar.sh" >&2
    # Forcer l'utilisation de Java 21 pour SonarScanner
    export JAVA_HOME="/usr/local/openjdk-21"
    export PATH="${JAVA_HOME}/bin:${PATH}"
    "$SONAR_SCRIPT_PATH" "$REPO_NAME" "$PROJECT_KEY" "$SONAR_SOURCES"
    SONAR_SCAN_STATUS=$?
    echo "[DEBUG] setup-sonar.sh terminé avec code $SONAR_SCAN_STATUS" >&2
  else
    echo "[INFO] Lancement de l'analyse SonarCloud (sonar-scanner direct)..."
    # Forcer l'utilisation de Java 21 pour SonarScanner
    export JAVA_HOME="/usr/local/openjdk-21"
    export PATH="${JAVA_HOME}/bin:${PATH}"
    (cd "$REPO_NAME" && sonar-scanner -Dsonar.projectKey="$PROJECT_KEY" -Dsonar.organization="$ORGANIZATION" -Dsonar.sources="$SONAR_SOURCES" -Dsonar.login="$SONAR_TOKEN")
    SONAR_SCAN_STATUS=$?
    sleep 10
  fi
  if [ $SONAR_SCAN_STATUS -ne 0 ]; then
    echo "[DEBUG] SonarCloud analysis failed. Project was not created or updated." >&2
    echo '{"error":"SonarCloud analysis failed"}' > "$TEMP_DIR/sonar_results.json"
  else
    echo "[DEBUG] Récupération des métriques SonarCloud" >&2
    SONAR_METRICS=$(curl -s -u ${SONAR_TOKEN}: "https://sonarcloud.io/api/measures/component?component=${PROJECT_KEY}&metricKeys=alert_status,bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density,ncloc")
    echo "[DEBUG] Réponse brute SONAR_METRICS : $SONAR_METRICS" >&2
    if echo "$SONAR_METRICS" | grep -q 'Component key .* not found'; then
      echo "[DEBUG] Project key '${PROJECT_KEY}' not found on SonarCloud. Did the analysis succeed?" >&2
      echo '{"error":"Project key not found on SonarCloud"}' > "$TEMP_DIR/sonar_results.json"
    else
      SONAR_VULNS=$(curl -s -u ${SONAR_TOKEN}: "https://sonarcloud.io/api/issues/search?projectKeys=${PROJECT_KEY}&types=VULNERABILITY")
      echo "[DEBUG] Réponse brute SONAR_VULNS : $SONAR_VULNS" >&2
      jq -n \
        --argjson metrics "$SONAR_METRICS" \
        --argjson vulns "$SONAR_VULNS" \
        --arg repo "$REPO_URL" \
        --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        '{sonarcloud_metrics: $metrics, sonarcloud_vulnerabilities: $vulns, repository: $repo, timestamp: $timestamp}' > "$TEMP_DIR/sonar_results.json"
      echo "Résultat SonarCloud écrit dans : $TEMP_DIR/sonar_results.json"
      cat "$TEMP_DIR/sonar_results.json"
    fi
  fi
else
  echo "[WARN] Aucun fichier sonar-project.properties trouvé, analyse SonarCloud ignorée."
  echo '{"error":"sonar-project.properties not found"}' > "$TEMP_DIR/sonar_results.json"
fi

# Function to get other tool results
get_other_tool_results() {
    echo "Démarrage des analyses de sécurité..."
    
    # Trivy scan
    echo "Lancement de Trivy..."
    trivy fs "$REPO_NAME" --cache-dir ~/.cache/trivy --scanners vuln,secret --include-dev-deps --severity LOW,MEDIUM,HIGH,CRITICAL --format json --timeout 5m --output "$TEMP_DIR/trivy.json"
    
    # SNYK scan
    echo "Lancement de Snyk..."
    if [ -f "$REPO_NAME/package.json" ]; then
      (cd "$REPO_NAME" && npm install)
    fi
    (cd "$REPO_NAME" && snyk test --all-projects --org=0927db18-d20b-4277-819e-de3936cf32c8 --json > "$TEMP_DIR/snyk.json" && snyk monitor --all-projects --org=0927db18-d20b-4277-819e-de3936cf32c8)
    
    # Créer un fichier de suppression XML valide
    SUPPRESSION_FILE="$TEMP_DIR/suppressions.xml"
    echo '<?xml version="1.0" encoding="UTF-8"?>
<suppressions xmlns="https://jeremylong.github.io/DependencyCheck/dependency-suppression.1.3.xsd">
</suppressions>' > "$SUPPRESSION_FILE"

    # Lancement de OWASP Dependency Check
    echo "Lancement de OWASP Dependency Check..."
    dependency-check --scan "$REPO_NAME" \
                    --format JSON \
                    --out "$TEMP_DIR/dc-report" \
                    --suppression "$SUPPRESSION_FILE" \
                    --failOnCVSS 0 \
                    --enableRetired

    # Vérifier si le rapport existe et est un JSON valide
    if [ -f "$TEMP_DIR/dc-report/dependency-check-report.json" ]; then
        # Vérifier si le fichier est un JSON valide
        if ! jq empty "$TEMP_DIR/dc-report/dependency-check-report.json" 2>/dev/null; then
            # Si le fichier n'est pas un JSON valide, créer un rapport vide
            echo '{"dependencies":[]}' > "$TEMP_DIR/dc-report/dependency-check-report.json"
        fi
    else
        # Le rapport n'existe pas, on le crée
        echo '{"dependencies":[]}' > "$TEMP_DIR/dc-report/dependency-check-report.json"
    fi
    
    # Vérifier que les fichiers de résultats existent
    [ -f "$TEMP_DIR/trivy.json" ] || echo '{}' > "$TEMP_DIR/trivy.json"
    [ -f "$TEMP_DIR/snyk.json" ] || echo '{}' > "$TEMP_DIR/snyk.json"
    [ -f "$TEMP_DIR/dc-report/dependency-check-report.json" ] || echo '{}' > "$TEMP_DIR/dc-report/dependency-check-report.json"
    
    # DEBUG: Afficher la taille et le contenu des fichiers JSON
    echo "DEBUG: Taille et contenu $TEMP_DIR/sonar_results.json :"
    ls -lh "$TEMP_DIR/sonar_results.json"
    cat "$TEMP_DIR/sonar_results.json"
    echo "DEBUG: Taille et contenu $TEMP_DIR/trivy.json :"
    ls -lh "$TEMP_DIR/trivy.json"
    cat "$TEMP_DIR/trivy.json"
    echo "DEBUG: Taille et contenu $TEMP_DIR/snyk.json :"
    ls -lh "$TEMP_DIR/snyk.json"
    cat "$TEMP_DIR/snyk.json"
    echo "DEBUG: Taille et contenu $TEMP_DIR/dc-report/dependency-check-report.json :"
    ls -lh "$TEMP_DIR/dc-report/dependency-check-report.json"
    cat "$TEMP_DIR/dc-report/dependency-check-report.json"
    
    # Affichage séparé de chaque outil (blocs JSON uniquement)
    echo "=== Résultat SonarCloud ==="
    cat "$TEMP_DIR/sonar_results.json"
    echo "=== Résultat Trivy ==="
    cat "$TEMP_DIR/trivy.json"
    echo "=== Résultat Snyk ==="
    cat "$TEMP_DIR/snyk.json"
    echo "=== Résultat OWASP Dependency Check ==="
    cat "$TEMP_DIR/dc-report/dependency-check-report.json"
}

# Vérifier les prérequis avant de commencer
check_prerequisites

# Main execution
get_other_tool_results

echo "LOG_FILE_PATH:$LOG_FILE"

sleep 60