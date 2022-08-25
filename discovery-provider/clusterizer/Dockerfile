# syntax=docker/dockerfile:1
FROM node:alpine


WORKDIR /tmp
RUN apk add --update curl &&\
  wget https://github.com/nats-io/nats-server/releases/download/v2.8.4/nats-server-v2.8.4-linux-amd64.zip &&\
  unzip nats-server-v2.8.4-linux-amd64.zip &&\
  mv nats-server-v2.8.4-linux-amd64/nats-server /bin &&\
  wget https://github.com/nats-io/natscli/releases/download/v0.0.33/nats-0.0.33-linux-amd64.zip &&\
  unzip nats-0.0.33-linux-amd64.zip &&\
  mv nats-0.0.33-linux-amd64/nats /bin &&\
  wget https://github.com/nats-io/nsc/releases/download/2.7.2/nsc-linux-amd64.zip &&\
  unzip nsc-linux-amd64.zip &&\
  mv nsc /bin &&\
  wget https://github.com/nats-io/prometheus-nats-exporter/releases/download/v0.10.0/prometheus-nats-exporter-v0.10.0-linux-amd64.zip &&\
  unzip prometheus-nats-exporter-v0.10.0-linux-amd64.zip &&\
  mv prometheus-nats-exporter-v0.10.0-linux-amd64/prometheus-nats-exporter /bin



WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install && npm install -g pm2

COPY . .

# TODO: for fast "local" iteration
# RUN npm run tsc

EXPOSE 8925
CMD pm2-runtime ecosystem.config.cjs --only clusterizer
