FROM node:18 as build
WORKDIR /app
# Copie le package.json depuis la racine du projet
COPY package*.json ./
RUN npm install
# Copie le reste des fichiers
COPY . .
RUN npm run build --prod

FROM nginx:alpine
COPY --from=build /app/dist/ /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]