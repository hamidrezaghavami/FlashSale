FROM node:18-alpine

WORKDIR /FlashSale/api

COPY package*.json ./

RUN npm install --only=production

COPY . .

EXPOSE 3000

CMD [ "node", "app.js" ]