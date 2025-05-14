# Étape de construction
FROM node:16 AS build

WORKDIR /app

# Copier les fichiers de configuration et les sources
COPY package*.json ./
RUN npm install
COPY . .

# Build du projet Angular
RUN npm run build --prod

# Étape pour exécuter l'application
FROM nginx:alpine

COPY --from=build /app/dist/temp-app/ /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
