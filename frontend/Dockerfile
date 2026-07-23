FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN cp package.json /package-installed.json

COPY . .

COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 5173

ENTRYPOINT ["/entrypoint.sh"]
CMD ["npm", "run", "dev"]
