FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p /app/uploads /app/data
ENV PORT=10000
EXPOSE 10000
CMD ["npm","start"]