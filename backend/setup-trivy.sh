#!/bin/bash
# Script pour lancer un scan Trivy localement et générer un rapport JSON

# Chemin du dossier à scanner (par défaut le dossier courant)
SCAN_PATH="${1:-.}"

# Télécharger Trivy dynamiquement si non présent
if ! command -v trivy &> /dev/null; then
  echo "📦 Téléchargement de Trivy..."
  wget -q https://github.com/aquasecurity/trivy/releases/latest/download/trivy_0.50.0_Linux-64bit.tar.gz
  tar -xzf trivy_0.50.0_Linux-64bit.tar.gz
  sudo mv trivy /usr/local/bin/
  rm trivy_0.50.0_Linux-64bit.tar.gz
fi

# Lancer le scan
echo "🚨 Lancement du scan Trivy sur $SCAN_PATH"
trivy fs "$SCAN_PATH" --format json --output result-trivy.json

# Vérifier résultat
if [ -f "result-trivy.json" ]; then
  echo "Rapport généré : result-trivy.json"
else
  echo " Erreur lors du scan avec Trivy"
  exit 1
fi

# (Optionnel) Envoi du résultat vers ton backend
# curl -X POST -H "Content-Type: application/json" -d @result-trivy.json http://localhost:5000/api/trivy-results
