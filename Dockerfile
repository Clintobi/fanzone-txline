FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
# Native WebSocket accelerators are optional; the supported JS fallback keeps the
# judge image portable across amd64 and Apple Silicon without a compiler toolchain.
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
