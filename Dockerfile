# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS server-deps
WORKDIR /app
COPY server/package.json ./server/package.json
RUN npm install --prefix server --omit=dev

FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json ./package.json
COPY client/package-lock.json ./package-lock.json
RUN npm install
COPY client ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app/server
ENV NODE_ENV=production
COPY --from=server-deps /app/server/node_modules ./node_modules
COPY server/ .
COPY --from=client-build /app/client/build ./client-build
ENV PORT=5000
ENV SQLITE_PATH=/data/streetlifting.db
ENV CLIENT_BUILD_PATH=/app/server/client-build
ENV SERVE_CLIENT=true
EXPOSE 5000
CMD ["node", "index.js"]

