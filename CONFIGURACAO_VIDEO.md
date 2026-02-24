# Configuração de Chamadas de Vídeo e Áudio

## ✅ O que foi implementado

Sistema completo de chamadas de vídeo e áudio usando GetStream Video SDK, similar ao WhatsApp e Facebook:

### Funcionalidades
- ✅ Chamadas de vídeo 1-on-1
- ✅ Chamadas de áudio 1-on-1
- ✅ Interface com controles (mute, câmera, speaker)
- ✅ Notificações de chamadas recebidas
- ✅ Modo minimizado (continuar navegando durante chamada)
- ✅ Layout responsivo e bonito
- ✅ Integração com chat existente

### Componentes Criados
- `VideoContext.jsx` - Gerenciamento do cliente de vídeo
- `VideoCallModal.jsx` - Interface da chamada
- `CallButtons.jsx` - Botões para iniciar chamadas
- `IncomingCallNotification.jsx` - Notificação de chamadas recebidas
- `useVideo.js` - Hooks personalizados para vídeo

## 🔧 Configuração Necessária

### 1. Configurar Firebase Functions

As Firebase Functions já estão configuradas com a função `createStreamVideoToken`. 

#### Deploy da função:

```bash
cd functions
npm install
npm run build
firebase deploy --only functions:createStreamVideoToken
```

#### Configurar o secret do GetStream Video:

```bash
firebase functions:config:set stream.video_secret="SEU_STREAM_VIDEO_SECRET"
# ou se usar o mesmo secret do chat:
firebase functions:config:set stream.secret="SEU_STREAM_SECRET"
```

**Onde encontrar o secret:**
1. Acesse [https://getstream.io/dashboard](https://getstream.io/dashboard)
2. Vá para Video & Audio → Overview
3. Copie o **Secret** (NÃO compartilhe publicamente!)

### 2. Variáveis de Ambiente (.env)

Seu arquivo `.env` já está configurado:

```env
VITE_STREAM_API_KEY=7bvs82ccmuv5
VITE_STREAM_VIDEO_API_KEY=7bvs82ccmuv5
VITE_STREAM_VIDEO_APP_ID=1447086
```

✅ Essas configurações estão corretas!

### 3. Habilitar Video no GetStream Dashboard

1. Acesse [https://getstream.io/dashboard](https://getstream.io/dashboard)
2. Selecione seu projeto (App ID: 1447086)
3. Vá para **Video & Audio** → **Settings**
4. Certifique-se de que o plano inclui Video Calling
5. Configure as permissões de chamada conforme necessário

## 🚀 Como Usar

### Para Usuários Finais

1. **Iniciar Chamada de Vídeo:**
   - Abra uma conversa 1-on-1
   - Clique no botão azul de vídeo no header do chat
   - A chamada será iniciada

2. **Iniciar Chamada de Áudio:**
   - Abra uma conversa 1-on-1  
   - Clique no botão verde de telefone no header do chat
   - A chamada será iniciada apenas com áudio

3. **Receber Chamada:**
   - Uma notificação aparecerá na tela
   - Clique no botão verde para aceitar
   - Clique no botão vermelho para rejeitar

4. **Durante a Chamada:**
   - **Microfone:** Ativar/desativar áudio
   - **Câmera:** Ativar/desativar vídeo (apenas em chamadas de vídeo)
   - **Alto-falante:** Ativar/desativar som
   - **Minimizar:** Continuar navegando com chamada ativa
   - **Encerrar:** Botão vermelho para sair da chamada

### Para Desenvolvedores

#### Iniciar chamada programaticamente:

```javascript
import { useCallActions } from '../hooks/useVideo';

function MeuComponente({ userId }) {
  const { startVideoCall, startAudioCall } = useCallActions();
  
  const handleVideoCall = async () => {
    await startVideoCall(userId);
  };
  
  const handleAudioCall = async () => {
    await startAudioCall(userId);
  };
  
  return (
    <>
      <button onClick={handleVideoCall}>Videochamada</button>
      <button onClick={handleAudioCall}>Chamada de Áudio</button>
    </>
  );
}
```

#### Adicionar botões de chamada em qualquer lugar:

```javascript
import CallButtons from '../components/CallButtons';

<CallButtons 
  userId={targetUserId}
  userName={targetUserName}
  userImage={targetUserImage}
/>
```

## 🐛 Troubleshooting

### Erro: "Token de vídeo não disponível"

**Solução:**
1. Certifique-se de que as Firebase Functions foram deployadas
2. Configure o `stream.video_secret` ou `stream.secret`
3. Verifique se o usuário está autenticado

### Erro: "STREAM_API_KEY is not defined"

**Solução:**
1. Verifique se o arquivo `.env` existe e tem as variáveis corretas
2. Reinicie o servidor de desenvolvimento: `npm run dev`

### Chamada não conecta

**Solução:**
1. Verifique se ambos usuários têm tokens válidos
2. Confirme que o App ID e API Key estão corretos
3. Verifique o console do navegador para erros

### Sem áudio/vídeo

**Solução:**
1. Permita acesso à câmera e microfone no navegador
2. Verifique se outros apps não estão usando a câmera
3. Teste com `navigator.mediaDevices.getUserMedia()`

## 📋 Checklist de Produção

Antes de colocar em produção:

- [ ] Deploy das Firebase Functions
- [ ] Configurar `stream.video_secret` no Firebase
- [ ] Testar chamadas entre dispositivos diferentes
- [ ] Testar em diferentes navegadores (Chrome, Firefox, Safari)
- [ ] Testar em mobile (iOS e Android)
- [ ] Configurar rate limiting (evitar abuso)
- [ ] Monitorar custos no GetStream Dashboard
- [ ] Documentar para usuários finais
- [ ] Testar com conexões lentas
- [ ] Implementar analytics de chamadas

## 💰 Custos

GetStream Video cobra por:
- Minutos de chamada
- Número de participantes simultâneos
- Largura de banda usada

Consulte [https://getstream.io/video/pricing/](https://getstream.io/video/pricing/) para detalhes.

## 📚 Recursos Adicionais

- [GetStream Video Docs](https://getstream.io/video/docs/)
- [React Video SDK](https://getstream.io/video/docs/react/)
- [Video Tutorial](https://getstream.io/video/sdk/react/tutorial/video-calling/)
- [Dashboard GetStream](https://getstream.io/dashboard)

## 🆘 Suporte

Se precisar de ajuda:
1. Verifique os logs do navegador (Console)
2. Verifique os logs do Firebase Functions
3. Consulte a documentação do GetStream
4. Entre em contato com o suporte GetStream: https://getstream.io/contact/

---

**Última atualização:** 17 de Novembro de 2025
