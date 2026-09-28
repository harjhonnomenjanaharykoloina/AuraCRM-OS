#!/bin/bash

set -e

echo "🚀 Configuration des variables Railway pour AuraCRM..."

railway variables set \
  GOOGLE_CALLBACK_URL=https://auracrm-production.up.railway.app/api/auth/callback/google
  AUTH_URL=https://accounts.google.com/o/oauth2/auth
  TOKEN_URL=https://oauth2.googleapis.com/token
  AUTH_PROVIDER_x509_CERLT_URL=https://www.googleapis.com/oauth2/v1/certs
  PROJECT_ID=avia-mystery-508405-f1

echo ""
echo "✅ Variables Railway configurées !"
echo ""
echo "🔎 Vérification..."
railway variables
