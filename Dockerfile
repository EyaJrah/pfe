# Étape 1 : Build Angular
FROM node:18 as frontend-build
WORKDIR /app
COPY ./frontend/ .
RUN npm install
RUN npm run build

# Étape 2 : Préparer le backend
FROM node:18 as backend
WORKDIR /app
COPY ./backend/ .
COPY --from=frontend-build /app/dist/ /app/public/
RUN npm install

# Étape finale : lancer le backend
EXPOSE 5000
CMD ["node", "server.js"]
