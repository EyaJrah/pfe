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

# Copie les fichiers Angular compilés
COPY --from=frontend-build /app/dist/temp-app/browser/ ./dist/temp-app/browser/

# Expose le port
EXPOSE 5000

# Démarre le serveur
CMD ["node", "server.js"]
