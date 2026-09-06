# Ravenof PvP serveris – vienas Node procesas, engine.ts sukompiliuotas esbuild'u.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run server:build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY --from=build /app/apps/server/dist ./dist
EXPOSE 8080
CMD ["node", "dist/index.mjs"]
