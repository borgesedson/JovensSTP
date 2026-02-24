# Como Obter YouTube API Key

## 1. Acesse o Google Cloud Console
https://console.cloud.google.com/

## 2. Crie um Projeto (se não tiver)
- Clique em "Select a project" no topo
- Clique em "NEW PROJECT"
- Nome: "JovensSTP E-Learning"
- Clique em "CREATE"

## 3. Ative a YouTube Data API v3
- No menu lateral, vá em "APIs & Services" > "Library"
- Busque por "YouTube Data API v3"
- Clique em "ENABLE"

## 4. Crie Credenciais
- Vá em "APIs & Services" > "Credentials"
- Clique em "CREATE CREDENTIALS" > "API key"
- Copie a API key gerada

## 5. Restrinja a API Key (Recomendado)
- Clique na API key criada
- Em "Application restrictions":
  - Selecione "HTTP referrers (web sites)"
  - Adicione: `https://jovens-stp.web.app/*`
  - Adicione: `http://localhost:5173/*` (para desenvolvimento)
- Em "API restrictions":
  - Selecione "Restrict key"
  - Marque apenas "YouTube Data API v3"
- Clique em "SAVE"

## 6. Adicione no .env
```
VITE_YOUTUBE_API_KEY=SUA_API_KEY_AQUI
```

## 7. Reinicie o servidor
```bash
npm run dev
```

## Quota Gratuita
- **10,000 unidades/dia** (gratuito)
- Buscar playlist = 1 unidade
- Buscar vídeos = 1 unidade
- Suficiente para ~5,000 requisições/dia

## Troubleshooting
- Se der erro 403: Verifique se a API está ativada
- Se der erro 400: Verifique se a API key está correta
- Se der erro de quota: Aguarde 24h ou crie outro projeto
