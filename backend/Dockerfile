FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# node:20-alpine ja vem com um usuario "node" (uid 1000) nao-root pronto -
# so precisa passar a dono do /app pra ele e trocar de usuario antes do CMD
RUN chown -R node:node /app
USER node

EXPOSE 3000

CMD ["npm", "run", "dev"]
