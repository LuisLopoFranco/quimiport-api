# ---------- Etapa 1: build (instala tudo e compila o TypeScript) ----------
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
# Remove as dependências de desenvolvimento (TypeScript, Jest...) para a imagem final
RUN npm prune --omit=dev

# ---------- Etapa 2: runtime (somente o necessário para rodar) ----------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY db ./db
COPY docs/api ./docs/api
# Roda como usuário sem privilégios (já existe na imagem oficial do Node)
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
# As migrações rodam automaticamente na inicialização da API
CMD ["node", "dist/main/server.js"]