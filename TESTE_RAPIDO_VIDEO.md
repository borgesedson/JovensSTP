# 🚀 Teste Rápido - Chamadas de Vídeo (Modo Desenvolvimento)

## Passo 1: Habilitar Modo Desenvolvimento no GetStream

1. Acesse: https://getstream.io/dashboard
2. Faça login na sua conta
3. Selecione seu projeto (App ID: **1447086**)
4. No menu lateral, clique em **"Video & Audio"**
5. Vá em **"Settings"** ou **"Authentication"**
6. Procure por uma dessas opções:
   - **"Disable Auth Checks"**
   - **"Development Mode"**
   - **"Disable Authentication"** (para desenvolvimento)
7. **Ative** esta opção
8. Salve as alterações

## Passo 2: Reiniciar o Servidor

```bash
# Pare o servidor (Ctrl+C no terminal)
# Depois rode novamente:
npm run dev
```

## Passo 3: Testar as Chamadas

1. Abra **http://localhost:5173** no navegador
2. Faça login
3. Abra uma conversa 1-on-1 com outro usuário
4. Você verá 2 botões no header do chat:
   - 🎥 **Botão azul** = Chamada de vídeo
   - 📞 **Botão verde** = Chamada de áudio
5. Clique em um dos botões para testar

## Testando com 2 Usuários

### Opção A: Dois navegadores
1. Abra Chrome normal
2. Abra Chrome em modo anônimo (Ctrl+Shift+N)
3. Faça login com usuários diferentes em cada um
4. Inicie uma conversa entre eles
5. Faça uma chamada

### Opção B: Dois dispositivos
1. Acesse no computador: http://localhost:5173
2. Acesse no celular: http://SEU_IP:5173 (ex: http://192.168.1.14:5173)
3. Faça login com usuários diferentes
4. Teste a chamada

## ⚠️ Importante

- Este modo é **APENAS para desenvolvimento/testes**
- **NUNCA** use com "Disable Auth Checks" em produção
- Quando for para produção, você precisará:
  1. Desabilitar o "Disable Auth Checks"
  2. Configurar Firebase Functions
  3. Fazer deploy das functions

## 🐛 Se não funcionar

### Erro: "Cannot connect to Stream"
- Verifique se habilitou "Disable Auth Checks" no dashboard
- Confirme que o API Key está correto no .env
- Reinicie o servidor

### Erro: "Permission denied"
- Permita acesso à câmera e microfone no navegador
- No Chrome: canto superior esquerdo, clique no ícone de cadeado
- Permita "Câmera" e "Microfone"

### Sem áudio/vídeo na chamada
- Certifique-se que a câmera/microfone não estão em uso
- Feche outros apps que usam câmera (Zoom, Teams, etc)
- Teste em modo anônimo

## ✅ Funcionou?

Se funcionou, você pode:
- Continuar testando em modo dev
- Quando estiver pronto para produção, me avise que configuro as Firebase Functions

---

**Dúvidas?** Me chame que te ajudo! 🚀
