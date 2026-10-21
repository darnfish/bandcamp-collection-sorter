FROM node:24-trixie-slim

WORKDIR /usr/src/app
COPY . .

RUN yarn install --frozen-lockfile

CMD yarn start
