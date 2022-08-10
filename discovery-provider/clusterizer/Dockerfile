# syntax=docker/dockerfile:1
FROM alpine:3.16

RUN apk add --update make g++ python3 nodejs npm curl

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 8925
CMD npm run start