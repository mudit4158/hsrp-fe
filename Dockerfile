FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
# The contracts drift check needs the backend checkout, which is not in this build context; tsc + vite only.
RUN pnpm exec tsc -p tsconfig.json && pnpm exec vite build

FROM nginx:1.27-alpine
# The official image renders /etc/nginx/templates/*.template into conf.d with envsubst at start-up.
ENV NGINX_ENVSUBST_FILTER=API_UPSTREAM
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
