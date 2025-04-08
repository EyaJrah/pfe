#!/bin/bash

# Create reports directory if it doesn't exist
mkdir -p reports

# Run OWASP Dependency-Check using Docker
docker run --rm \
  -v "$(pwd):/src:ro" \
  -v "$(pwd)/reports:/report" \
  owasp/dependency-check:7.4.4 \
  --scan /src \
  --format "HTML" \
  --out "/report" \
  --project "CheckSec" \
  --failOnCVSS 7 \
  --enableRetired

# Check if the scan was successful
if [ $? -eq 0 ]; then
  echo "OWASP Dependency-Check completed successfully"
  exit 0
else
  echo "OWASP Dependency-Check failed"
  exit 1
fi 