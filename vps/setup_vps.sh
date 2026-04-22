#!/bin/bash

# ==============================================================================
# Script de Configuração Automática da VPS (Ubuntu / Debian)
# JovensSTP - Whisper & ArgosTranslate com PostgreSQL
# ==============================================================================

# 1. Atualizar o sistema e instalar dependências básicas
echo "🔄 A atualizar o sistema e instalar dependências (PostgreSQL, Python, FFmpeg para áudio)..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y postgresql postgresql-contrib python3-pip python3-venv ffmpeg libpq-dev

# 2. Configurar o PostgreSQL (Base de Dados)
# Este bloco entra no Postgres e cria a base de dados, o utilizador e dá permissões.
echo "🗄️ A configurar o PostgreSQL..."
sudo -u postgres psql -c "CREATE DATABASE jovens_stp;"
sudo -u postgres psql -c "CREATE USER jovens_db_master WITH PASSWORD 'senhaForte123';"
sudo -u postgres psql -c "ALTER ROLE jovens_db_master SET client_encoding TO 'utf8';"
sudo -u postgres psql -c "ALTER ROLE jovens_db_master SET default_transaction_isolation TO 'read committed';"
sudo -u postgres psql -c "ALTER ROLE jovens_db_master SET timezone TO 'UTC';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE jovens_stp TO jovens_db_master;"

# 3. Criar ambiente virtual Python e instalar bibliotecas
echo "🐍 A preparar o ambiente Python..."
python3 -m venv venv
source venv/bin/activate

# Instalar pacotes necessários (Whisper, Flask, PostgreSQL adapter, Argos, langdetect, waitress)
pip install Flask flask-cors psycopg2 git+https://github.com/openai/whisper.git argostranslate langdetect waitress

# 4. Configurar pacotes de tradução (ArgosTranslate)
# Aqui fazemos download dos pares de línguas para o Argos (Inglês <-> Português, etc)
echo "🌍 A descarregar pacotes de tradução (Argos Translate)..."
export ARGOS_PACKAGES_DIR=~/.local/share/argos-translate/packages
argospm update
argospm install translate-en_pt
argospm install translate-pt_en
# (Podes adicionar mais depois: es_en, en_fr, etc.)

echo "✅ Configuração da VPS concluída!"
echo "🚀 Para iniciar o servidor, usa os comandos:"
echo "source venv/bin/activate"
echo "python app.py"
