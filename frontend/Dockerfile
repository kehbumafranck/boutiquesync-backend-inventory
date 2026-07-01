# === PHASE 1 : Build Vite ===
FROM node:20-alpine AS build

WORKDIR /app

# Copie des fichiers de dépendances en premier (cache Docker)
COPY package*.json ./
RUN npm ci --frozen-lockfile

# Copie du code source
COPY . .

# Build de production (utilise VITE_API_URL passé en ARG/ENV)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

# === PHASE 2 : Nginx léger pour servir le SPA ===
FROM nginx:alpine

# Copie des fichiers buildés
COPY --from=build /app/dist /usr/share/nginx/html

# Config Nginx pour les SPA React Router (toutes les routes → index.html)
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    location /api/ {\n\
        proxy_pass http://boutiquesync-backend:8085;\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_set_header X-Forwarded-Proto $scheme;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
