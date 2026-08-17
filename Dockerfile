# Etapa 1: Construcción (Node.js)
FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar código fuente y compilar bundle PWA
COPY . .
RUN npm run build

# Etapa 2: Servidor Web Nginx ligero para Producción
FROM nginx:alpine

# Copiar build optimizado de Vite
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración Nginx con soporte SPA y caché PWA
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
