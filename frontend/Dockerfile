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

# imagem "unprivileged": todo o processo do nginx (master + workers) roda
# como usuario nao-root (nginx, uid 101) desde o start, sem precisar de
# nenhum passo extra de USER/chown - so muda a porta padrao pra 8080, ja
# que portas <1024 exigem root pra dar bind
FROM nginxinc/nginx-unprivileged:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
