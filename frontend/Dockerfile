FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite embute VITE_* no bundle em build-time, nao em runtime - por isso
# precisam chegar como build ARG (docker-compose passa via `build.args`),
# nao como `environment:` do container final
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ARG VITE_APK_DOWNLOAD_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_APK_DOWNLOAD_URL=$VITE_APK_DOWNLOAD_URL

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
