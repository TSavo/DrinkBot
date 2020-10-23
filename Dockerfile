FROM node:latest
WORKDIR /app
RUN npm install
RUN npm install -g nodemon
CMD npm start