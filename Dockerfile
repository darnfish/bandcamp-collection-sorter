FROM node:lts-buster

WORKDIR /usr/src/app
COPY . .

RUN yarn

CMD yarn start
