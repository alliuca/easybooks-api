FROM node:8

RUN groupadd -r nodejs && useradd -m -r -g nodejs -s /bin/bash nodejs

#RUN mkdir /home/nodejs/api
WORKDIR /home/nodejs/api

ENV PATH /home/nodejs/api/node_modules/.bin:$PATH
ENV NODE_ENV production

COPY . .
RUN chown -R nodejs:nodejs .

USER nodejs
RUN npm install --production

EXPOSE 3030
CMD ["node", "index.js"]
