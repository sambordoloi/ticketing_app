#!/bin/sh
set -e

echo "Running database migrations..."

if [ "$PRISMA_FORCE_RESET" = "true" ]; then
  echo "PRISMA_FORCE_RESET=true — resetting database schema (all data will be lost)"
  npx prisma db push --force-reset
else
  if ! npx prisma db push 2>/tmp/prisma-push.err; then
    if grep -q "cannot be executed" /tmp/prisma-push.err; then
      echo ""
      echo "⚠️  Schema migration failed because existing data is incompatible."
      echo "   Run once with PRISMA_FORCE_RESET=true in .env to reset the database:"
      echo "   PRISMA_FORCE_RESET=true docker-compose up --build -d"
      echo ""
      cat /tmp/prisma-push.err
      exit 1
    fi
    cat /tmp/prisma-push.err
    exit 1
  fi
fi

echo "Regenerating Prisma client..."
npx prisma generate

echo "Seeding database (if needed)..."
npm run db:seed

echo "Starting server..."
exec npm run dev
