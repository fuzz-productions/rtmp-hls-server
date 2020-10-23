FROM node:12

COPY . /usr/src
WORKDIR /usr/src
RUN yarn install

EXPOSE 3000

CMD ["yarn", "start"]