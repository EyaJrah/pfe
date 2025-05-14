# Étape 1 : Build de l'app Angular
FROM node:18 as build-frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build --prod

# Étape 2 : Build du backend + intégration du frontend
FROM node:18
WORKDIR /app
COPY backend/package*.json ./
RUN npm install

# Copie du backend
COPY backend/ .

# Copie du frontend compilé dans un dossier public
COPY --from=build-frontend /app/frontend/dist /app/frontend-dist

# Variables d'environnement (à configurer sur Render)
ENV PORT=5000

EXPOSE 5000
CMD ["node", "server.js"]
