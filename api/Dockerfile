FROM node:18-alpine

WORKDIR /FlashSale/api

COPY packgage*.json ./

RUN npm install --only=production

COPY . .

EXPOSE 3000

USER admin

CMD [ "node", "app.js" ]