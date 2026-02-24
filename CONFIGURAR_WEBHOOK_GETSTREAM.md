# 🔗 Configuração do Webhook GetStream

## ⚠️ IMPORTANTE - Configuração Manual Necessária

Para que as **notificações de mensagens** funcionem com o app fechado, você precisa configurar o webhook no GetStream Dashboard.

## 📋 Passo a Passo

### 1. Acessar GetStream Dashboard

1. Vá para: https://getstream.io/dashboard/
2. Faça login com sua conta
3. Selecione o projeto **"jovens-stp"** (ou o nome do seu projeto)

### 2. Configurar Webhook

1. No menu lateral, clique em **"Chat"**
2. Depois clique em **"Webhooks"**
3. Clique no botão **"Add Webhook"** ou **"New Webhook"**

### 3. Preencher Formulário

Configure com estes valores EXATOS:

```
Webhook URL:
https://notifyonnewmessage-u74la5akbq-uc.a.run.app

Events to listen:
☑ message.new

Active:
☑ ON (ativado)

Description (opcional):
Push notification para mensagens novas
```

### 4. Salvar

1. Clique em **"Save"** ou **"Create Webhook"**
2. Webhook estará ativo imediatamente

## ✅ Como Testar

Depois de configurar:

1. **Dispositivo A:** Feche completamente o navegador
2. **Dispositivo B:** Envie mensagem para usuário A
3. **Dispositivo A:** Deve receber notificação push com:
   - Título: Nome do remetente
   - Corpo: Texto da mensagem
   - Som: message.mp3
   - Clicar abre o chat

## 🔍 Verificar se Está Funcionando

### No GetStream Dashboard:

1. Vá em **Chat → Webhooks**
2. Clique no webhook que criou
3. Role até **"Recent Events"** ou **"Event Log"**
4. Você verá:
   - ✅ Verde = Webhook funcionando (status 200)
   - ❌ Vermelho = Erro (status 500/404)

### Via Firebase Console:

1. Acesse: https://console.firebase.google.com/project/jovens-stp/functions
2. Clique em **"notifyOnNewMessage"**
3. Vá em **"Logs"**
4. Envie uma mensagem de teste
5. Deve aparecer log com: "✅ Notification sent"

## 🚨 Troubleshooting

### Webhook não aparece nos logs do GetStream

**Causa:** URL incorreta ou webhook não está ativo

**Solução:**
- Verifique se copiou a URL corretamente (sem espaços extras)
- Certifique-se que está marcado como **Active: ON**

### Erro 401 Unauthorized

**Causa:** GetStream não consegue autenticar

**Solução:**
- Webhook de mensagens não precisa autenticação
- Verifique se o endpoint `/notifyOnNewMessage` aceita requests públicos

### Erro 500 Internal Server Error

**Causa:** Erro na Cloud Function

**Solução:**
```bash
# Ver logs detalhados
firebase functions:log --only notifyOnNewMessage

# Redeployar function
firebase deploy --only functions:notifyOnNewMessage
```

### Notificação não chega no dispositivo

**Possíveis causas:**

1. **Usuário não tem FCM token salvo**
   ```javascript
   // Console do navegador
   firebase.firestore().collection('users').doc('USER_ID').get()
     .then(doc => console.log('Tokens:', doc.data().fcmTokens))
   ```

2. **Permissão de notificações não foi concedida**
   ```javascript
   console.log(Notification.permission) // Deve ser "granted"
   ```

3. **Service Worker não está registrado**
   ```javascript
   navigator.serviceWorker.getRegistrations()
     .then(regs => console.log('SW:', regs))
   ```

## 📊 Estrutura do Webhook

O GetStream envia dados neste formato:

```json
{
  "type": "message.new",
  "message": {
    "id": "msg-123",
    "text": "Olá, tudo bem?",
    "user": {
      "id": "user-456",
      "name": "Maria Silva",
      "image": "https://..."
    }
  },
  "channel": {
    "id": "messaging:channel-789",
    "type": "messaging",
    "members": {
      "user-123": {...},
      "user-456": {...}
    }
  }
}
```

Nossa function processa e envia FCM push para todos os membros do canal (exceto o remetente).

## 🎯 Resultado Final

Após configurar o webhook, o fluxo completo será:

```
1. Usuário B envia mensagem no chat
        ↓
2. GetStream detecta message.new
        ↓
3. GetStream chama webhook (nossa Cloud Function)
        ↓
4. Function busca FCM tokens do destinatário
        ↓
5. Function envia push notification via Firebase
        ↓
6. Usuário A recebe notificação (mesmo com app fechado)
        ↓
7. Service Worker toca som (message.mp3)
        ↓
8. Usuário A clica na notificação → App abre no chat
```

---

## 📝 Checklist Final

- [ ] Acessei GetStream Dashboard
- [ ] Configurei webhook com URL correta
- [ ] Marquei evento `message.new`
- [ ] Ativei webhook (Active: ON)
- [ ] Salvei configuração
- [ ] Testei enviando mensagem
- [ ] Recebi notificação no dispositivo com app fechado

---

**URL do Webhook:** https://notifyonnewmessage-u74la5akbq-uc.a.run.app

**Status:** ✅ Cloud Function deployada e funcionando

**Próximo passo:** Configure o webhook no dashboard!
