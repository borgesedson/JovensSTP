# 🔊 Sistema de Notificações Sonoras - Guia Completo

## ✅ Implementação Completa

### Arquivos Criados/Modificados

1. **`src/services/notificationSounds.js`** - Serviço central de sons
   - Gerencia 3 tipos de sons: chamada, mensagem, notificação
   - Som de chamada toca em loop
   - Pré-carrega arquivos de áudio
   - Escuta mensagens do Service Worker

2. **`public/firebase-messaging-sw.js`** - Service Worker atualizado
   - Detecta tipo de notificação (incoming_call, new_message, etc)
   - Envia mensagem `PLAY_NOTIFICATION_SOUND` para janelas abertas
   - Define `requireInteraction: true` para chamadas

3. **`src/components/IncomingCallToast.jsx`** - Integrado com sons
   - Toca som ao receber chamada
   - Para som ao aceitar/recusar

4. **`src/hooks/useMessageNotifications.js`** - Integrado com sons
   - Toca som ao receber mensagem nova
   - Ignora mensagens próprias

5. **`src/pages/HomePage.jsx`** - Integrado com sons
   - Toca som ao detectar novo post
   - Ignora posts próprios
   - Usa ref para não tocar no primeiro carregamento

## 📁 Arquivos de Áudio Necessários

Você precisa adicionar 3 arquivos MP3 em `public/sounds/`:

### 1. **ringtone.mp3** - Som de Chamada
- **Duração:** 5-10 segundos (vai repetir em loop)
- **Estilo:** Tom suave e repetitivo
- **Exemplo:** Toque de iPhone, som de sino contínuo
- **Onde baixar:**
  - [Ringtone iPhone (Zapsplat)](https://www.zapsplat.com/music/mobile-phone-ring-tone-1/)
  - [Phone Ringing (Freesound)](https://freesound.org/search/?q=phone+ringing)

### 2. **message.mp3** - Som de Mensagem
- **Duração:** 1-2 segundos
- **Estilo:** Pop, ding, ou whoosh curto
- **Exemplo:** Som de WhatsApp, Messenger
- **Onde baixar:**
  - [Message Pop (Mixkit)](https://mixkit.co/free-sound-effects/notification/)
  - [WhatsApp tone (Freesound)](https://freesound.org/search/?q=message+tone)

### 3. **notification.mp3** - Som Genérico
- **Duração:** 2-3 segundos
- **Estilo:** Bell, chime, ou alert suave
- **Exemplo:** Som de sino, notificação iOS
- **Onde baixar:**
  - [Notification Bell (Pixabay)](https://pixabay.com/sound-effects/search/notification/)
  - [Bell Chime (Zapsplat)](https://www.zapsplat.com/music/bell-notification/)

## 🎵 Como Adicionar os Sons

### Opção 1: Baixar Sons Prontos (Recomendado)

1. Acesse um dos sites acima
2. Baixe 3 arquivos MP3
3. Renomeie para: `ringtone.mp3`, `message.mp3`, `notification.mp3`
4. Coloque em `public/sounds/`

### Opção 2: Usar Sons do Sistema (Temporário)

```powershell
# Criar pasta
cd public/sounds

# Copiar sons do Windows (exemplo)
copy C:\Windows\Media\Ring01.wav ringtone.mp3
copy C:\Windows\Media\notify.wav message.mp3
copy C:\Windows\Media\Windows\ Notify\ System\ Generic.wav notification.mp3
```

### Opção 3: Gerar Sons com Audacity

1. Abra Audacity
2. Generate > Tone > Sine wave (440Hz, 2 segundos)
3. Export as MP3
4. Renomeie e salve em `public/sounds/`

## 🧪 Como Testar

### 1. Testar Som de Mensagem

1. Abra o app em 2 abas (ou 2 dispositivos)
2. Faça login com usuários diferentes em cada aba
3. Na Aba 1: Vá para Chat e envie mensagem para o usuário da Aba 2
4. **Resultado esperado:** Aba 2 toca `message.mp3` automaticamente

### 2. Testar Som de Chamada

1. Abra o app em 2 abas
2. Faça login com usuários diferentes
3. Na Aba 1: Vá ao perfil do usuário 2 e clique no botão de chamada
4. **Resultado esperado:**
   - Aba 2 toca `ringtone.mp3` em loop
   - Ao aceitar/recusar, o som para

### 3. Testar Som de Novo Post

1. Abra o app em 2 abas (mesmo usuário ou diferente)
2. Na Aba 1: Crie um novo post no feed
3. **Resultado esperado:** Aba 2 toca `notification.mp3` quando o post aparecer

### 4. Testar Push Notification (App Fechado)

⚠️ **Requer configuração adicional:**

1. Configure Firebase Cloud Messaging (FCM)
2. Implemente Cloud Functions para enviar notificações
3. Salve FCM tokens no Firestore
4. Envie push notification ao criar post/mensagem

**Status:** Service Worker pronto, falta implementar Cloud Functions

## 🐛 Troubleshooting

### Som não toca

**Problema:** Navegador bloqueia autoplay de áudio

**Solução:**
- Chrome: Vá em chrome://flags/#autoplay-policy e mude para "No user gesture required"
- Firefox: about:config > media.autoplay.default = 0
- Ou clique em qualquer lugar da página primeiro (ativa permissão de áudio)

### Erro "Cannot find /sounds/*.mp3"

**Problema:** Arquivos de áudio não existem

**Solução:**
- Adicione os 3 arquivos MP3 em `public/sounds/`
- Ou comente linha `notificationSounds.play*()` temporariamente

### Som toca duplicado

**Problema:** Múltiplos listeners registrados

**Solução:**
- Verifique se não está importando `notificationSounds` múltiplas vezes
- O serviço é singleton, então deve estar tudo ok

### Som de chamada não para

**Problema:** `stopCallSound()` não foi chamado

**Solução:**
- Verifique se `handleAccept` e `handleReject` estão chamando `notificationSounds.stopCallSound()`

## 📊 Fluxo de Notificações

### App Aberto (Foreground)

```
Nova Mensagem/Post/Chamada
        ↓
useMessageNotifications/IncomingCallToast detecta
        ↓
notificationSounds.play*() é chamado
        ↓
Som toca no navegador (HTMLAudioElement)
```

### App Fechado (Background)

```
Nova Mensagem/Post/Chamada
        ↓
Cloud Function envia FCM push notification
        ↓
firebase-messaging-sw.js recebe onBackgroundMessage
        ↓
Service Worker mostra notificação nativa
        ↓
Som do sistema toca (via notification API)
```

### App Aberto mas em outra aba (Background Tab)

```
Nova Mensagem/Post/Chamada
        ↓
Service Worker recebe onBackgroundMessage
        ↓
SW envia postMessage('PLAY_NOTIFICATION_SOUND')
        ↓
notificationSounds listener recebe mensagem
        ↓
Som toca na aba em background
```

## 🚀 Deploy

Fazer build e deploy:

```powershell
npm run build
firebase deploy --only hosting
```

Testar em produção:
- https://jovens-stp.web.app

## 📋 Próximos Passos (Opcional)

### 1. Cloud Functions para Push Notifications

Criar `functions/src/notifications.ts`:

```typescript
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

export const sendMessageNotification = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data()
    
    // Buscar tokens FCM do destinatário
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(message.recipientId)
      .get()
    
    const fcmToken = userDoc.data()?.fcmToken
    if (!fcmToken) return
    
    // Enviar notificação
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: `${message.senderName}`,
        body: message.text
      },
      data: {
        type: 'new_message',
        channelId: message.channelId
      }
    })
  })
```

### 2. Salvar FCM Tokens

Em `src/services/notifications.js`:

```javascript
import { getMessaging, getToken } from 'firebase/messaging'
import { doc, updateDoc } from 'firebase/firestore'

export async function requestNotificationPermission(userId) {
  const permission = await Notification.requestPermission()
  if (permission === 'granted') {
    const messaging = getMessaging()
    const token = await getToken(messaging, {
      vapidKey: 'YOUR_VAPID_KEY'
    })
    
    await updateDoc(doc(db, 'users', userId), {
      fcmToken: token
    })
  }
}
```

### 3. Volume Control

Adicionar controles de volume em `notificationSounds.js`:

```javascript
setVolume(type, volume) {
  if (this.sounds[type]) {
    this.sounds[type].volume = volume // 0.0 - 1.0
  }
}
```

---

## ✨ Resumo

**Implementado:**
- ✅ Serviço de sons (`notificationSounds.js`)
- ✅ Integração com chamadas (toca e para ao aceitar/recusar)
- ✅ Integração com mensagens (toca ao receber)
- ✅ Integração com posts (toca ao detectar novo)
- ✅ Service Worker preparado para push notifications
- ✅ Arquivos de áudio configuráveis em `public/sounds/`

**Pendente:**
- ⏳ Adicionar 3 arquivos MP3 em `public/sounds/`
- ⏳ Cloud Functions para enviar push notifications
- ⏳ Salvar FCM tokens no Firestore

**Status:** Sistema 90% completo. Apenas falta adicionar os arquivos de áudio para testar.
