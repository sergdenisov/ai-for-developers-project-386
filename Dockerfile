# The Node.js version follows mise.toml.
FROM node:24.18.0-slim AS build
WORKDIR /app
COPY backend/package.json backend/package-lock.json backend/
COPY frontend/package.json frontend/package-lock.json frontend/
RUN npm ci --prefix backend && npm ci --prefix frontend
COPY backend backend
COPY frontend frontend
RUN npm run build --prefix backend && npm run build --prefix frontend

FROM node:24.18.0-slim AS dependencies
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# One process serves the API and the frontend on PORT (3000 by default).
FROM node:24.18.0-slim
ENV NODE_ENV=production
WORKDIR /app/backend
COPY backend/package.json ./
COPY --from=dependencies /app/backend/node_modules node_modules
COPY --from=build /app/backend/dist dist
COPY --from=build /app/frontend/dist ../frontend/dist
USER node
EXPOSE 3000
CMD ["node", "dist/server.js", "--frontend-dir", "../frontend/dist"]
