FROM node:20-alpine

WORKDIR /app

# Prisma requires OpenSSL on Alpine (especially ARM64)
RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY tsconfig.json ./
COPY src ./src/

RUN npx prisma generate

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push && npm run db:seed && npm run dev"]
