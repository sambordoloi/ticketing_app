FROM node:20-alpine

WORKDIR /app

# Prisma requires OpenSSL on Alpine (especially ARM64)
RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY tsconfig.json ./
COPY src ./src/
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

RUN npx prisma generate

EXPOSE 3002

CMD ["./docker-entrypoint.sh"]
