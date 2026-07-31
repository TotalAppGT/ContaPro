#!/bin/bash
set -e
echo "=== ContaPro Deploy ==="
echo "Instalando frontend..."
cd frontend && npm install
echo "Compilando frontend..."
npm run build
echo "Instalando backend..."
cd ../backend && npm install
echo "Iniciando servidor..."
npm start
