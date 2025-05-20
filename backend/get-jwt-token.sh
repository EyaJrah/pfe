#!/bin/bash
EMAIL="scan@example.com"
PASSWORD="scan123456"
API_URL="http://localhost:5000/api/users/login"

TOKEN=$(curl -s -X POST $API_URL \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | jq -r .token)

if [[ "$TOKEN" == "null" || -z "$TOKEN" ]]; then
  echo "Erreur lors de la récupération du token" >&2
  exit 1
fi

echo "$TOKEN" 