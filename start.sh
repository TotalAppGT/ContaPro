#!/bin/bash
set -e
echo "=== ContaPro Deploy ==="

echo "Instalando frontend..."
cd /app/frontend
npm install --include=dev

echo "Compilando frontend..."
npx vite build

echo "Instalando backend..."
cd /app/backend
npm install

echo "Iniciando servidor..."
npx tsx src/index.ts
