# Étape de construction
FROM node:16

WORKDIR /app

# Copier les fichiers de configuration et les sources
COPY package*.json ./
RUN npm install
COPY . .

# Exposer le port
EXPOSE 5000

# Lancer l'application
CMD ["node", "server.js"]
