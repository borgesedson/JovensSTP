# Sistema de Chamadas de Áudio e Vídeo 📞📹

Este documento descreve como implementar e usar o sistema completo de chamadas de áudio e vídeo no Jovens STP App, baseado no GetStream Video SDK.

## 🎯 Funcionalidades Implementadas

### ✅ Chamadas de Áudio
- Chamadas de áudio de alta qualidade
- Controles de microfone (mute/unmute)
- Controles de alto-falante
- Interface similar ao WhatsApp
- Notificações de chamadas recebidas

### ✅ Chamadas de Vídeo
- Chamadas de vídeo em tempo real
- Controles de câmera (ligar/desligar)
- Layout responsivo (speaker view)
- Modo minimizado durante chamada
- Troca de câmera (frontal/traseira)

### ✅ Interface do Usuário
- Modal de chamada com controles intuitivos
- Notificações de chamadas recebidas
- Botões de chamada integrados no chat
- Botões de chamada nos perfis públicos
- Estado de "conectando" e "chamando"

### ✅ Recursos Avançados
- Cancelamento de ruído (configurável)
- Gravação de chamadas (opcional)
- Qualidade de vídeo ajustável
- Estatísticas da chamada em tempo real
- Suporte a múltiplos dispositivos

## 🏗️ Arquitetura

### Contextos
```
VideoContext.jsx          # Gerenciamento do cliente GetStream Video
├── VideoProvider         # Provider principal
├── initializeVideoClient # Inicialização do cliente
├── createAudioCall       # Criação de chamada de áudio
├── createVideoCall       # Criação de chamada de vídeo
├── joinCall             # Entrada em chamada
└── endCall              # Encerrar chamada
```

### Hooks Customizados
```
useVideo.js              # Hook principal de vídeo
├── useVideo             # Acesso ao contexto
├── useCallState         # Estado da chamada atual
├── useMediaControls     # Controles de mídia
└── useCallActions       # Ações de chamada
```

### Componentes
```
VideoCallModal.jsx       # Interface principal de chamada
├── AudioCallLayout      # Layout para áudio
├── ConnectingState      # Estado de conectando
├── CustomCallControls   # Controles customizados
└── CallSettingsPanel    # Painel de configurações

CallButtons.jsx          # Botões de iniciar chamada
└── Integrado em chat e perfis

IncomingCallNotification # Notificação de chamadas recebidas
├── Aceitar chamada
├── Rejeitar chamada
└── Aceitar apenas áudio
```

## 🚀 Como Usar

### 1. Configuração Inicial

#### Variáveis de Ambiente
```bash
# .env.local
VITE_STREAM_API_KEY=your_stream_api_key
VITE_STREAM_VIDEO_API_KEY=your_stream_video_api_key
VITE_ENABLE_VIDEO_CALLS=true
VITE_ENABLE_AUDIO_CALLS=true
```

#### Configuração do GetStream
1. Criar conta no [GetStream](https://getstream.io/video/)
2. Obter API Key do Video SDK
3. Configurar autenticação de usuários
4. Configurar tokens de usuário (backend)

### 2. Iniciar Chamadas

#### No Chat (DMś)
- Botões de áudio/vídeo aparecem automaticamente no header
- Clique no ícone do telefone para áudio
- Clique no ícone de vídeo para videochamada

#### Em Perfis Públicos
- Botões aparecem quando usuários podem se mensagear
- Disponível para conexões e perfis abertos
- Empresas podem ligar para jovens diretamente

### 3. Durante a Chamada

#### Controles Disponíveis
- **Microfone**: Mute/unmute áudio
- **Câmera**: Ligar/desligar vídeo (apenas vídeo calls)
- **Alto-falante**: Controlar saída de áudio
- **Encerrar**: Terminar chamada
- **Minimizar**: Continuar chamada em modo pequeno

#### Layouts
- **Vídeo**: SpeakerLayout com participante principal
- **Áudio**: Interface minimalista com avatar
- **Minimizado**: Pequena janela flutuante

### 4. Receber Chamadas

#### Notificação Automática
- Modal aparece automaticamente
- Som de toque (implementável)
- Opções: Aceitar, Rejeitar, Apenas Áudio
- Interface similar ao WhatsApp/iPhone

## 🔧 Configurações Avançadas

### Qualidade de Vídeo
```javascript
// Configurar qualidade padrão
const call = videoClient.call('default', callId);
await call.getOrCreate({
  data: {
    settings_override: {
      video: { 
        enabled: true,
        target_resolution: '720p' // 480p, 720p, 1080p
      }
    }
  }
});
```

### Cancelamento de Ruído
```javascript
// Ativar noise cancellation
import { NoiseCancellation } from '@stream-io/video-react-sdk';

const noiseCancellation = new NoiseCancellation();
await call.microphone.enableNoiseCancellation(noiseCancellation);
```

### Gravação de Chamadas
```javascript
// Iniciar gravação (requer configuração no backend)
await call.startRecording({
  recording_external_storage: 'my-storage'
});
```

## 📱 Experiência do Usuário

### Fluxo de Chamada de Vídeo
1. **Usuário A** clica em "Videochamada" no perfil do **Usuário B**
2. Sistema cria chamada e envia convite
3. **Usuário B** recebe notificação com som
4. **Usuário B** aceita → Ambos entram na chamada
5. Interface de vídeo com controles
6. Qualquer um pode encerrar a chamada

### Fluxo de Chamada de Áudio
1. **Usuário A** clica em "Chamada" no chat
2. Sistema cria chamada apenas áudio
3. **Usuário B** recebe notificação
4. Interface minimalista com controles de áudio
5. Opção de upgrade para vídeo durante chamada

### Estados da Chamada
- **Idle**: Sem chamada ativa
- **Ringing**: Chamada sendo feita/recebida
- **Joining**: Conectando à chamada
- **Joined**: Chamada ativa
- **Left**: Chamada encerrada

## 🛡️ Segurança e Privacidade

### Tokens de Usuário
```javascript
// Backend deve gerar tokens seguros
const generateUserToken = async (userId) => {
  // Implementar no backend com JWT
  return jwt.sign(
    { user_id: userId },
    STREAM_SECRET,
    { expiresIn: '1d' }
  );
};
```

### Permissões
- Apenas usuários conectados podem se ligar
- Empresas podem ligar para jovens diretamente
- Perfis podem desabilitar chamadas
- Controle de privacidade por tipo de usuário

### Qualidade e Performance
- Vídeo otimizado automaticamente
- Áudio com cancelamento de eco
- Adaptação de qualidade por conexão
- Suporte a dispositivos móveis e desktop

## 🐛 Resolução de Problemas

### Problemas Comuns

#### Erro de Permissão de Mídia
```javascript
// Verificar permissões do browser
if (!microphoneState.hasBrowserPermission) {
  await microphoneState.microphone.enable();
}
```

#### Token Inválido
```javascript
// Verificar configuração de API key
const client = new StreamVideoClient({
  apiKey: STREAM_API_KEY, // Verificar se está correto
  user: { id: userId },
  token: userToken // Deve vir do backend
});
```

#### Falha na Conexão
- Verificar conexão de internet
- Confirmar configurações de firewall
- Testar com different browsers

### Debug
```javascript
// Ativar logs detalhados
import { StreamVideo } from '@stream-io/video-react-sdk';

StreamVideo.setLogLevel('debug');
```

## 📚 Recursos Adicionais

### Documentação
- [GetStream Video Docs](https://getstream.io/video/docs/react/)
- [React Video SDK](https://getstream.io/video/sdk/react/)
- [Video Calling API](https://getstream.io/video/video-calling/)

### Exemplos
- [Tutorial Oficial](https://getstream.io/video/sdk/react/tutorial/video-calling/)
- [Sample Apps](https://github.com/GetStream/stream-video-js/tree/main/sample-apps)
- [UI Cookbook](https://getstream.io/video/docs/react/ui-cookbook/overview/)

## 🔄 Próximos Passos

### Melhorias Planejadas
1. **Chamadas em Grupo**: Suporte a múltiplos participantes
2. **Compartilhamento de Tela**: Screen sharing durante chamadas
3. **Integração com Calendar**: Agendar videochamadas
4. **Filtros de Vídeo**: Efeitos e filtros durante chamadas
5. **Transcrição**: Transcrição automática de chamadas
6. **Analytics**: Métricas de qualidade e uso

### Backend Requirements
1. **Token Generation**: Endpoint seguro para gerar tokens
2. **Call Management**: APIs para gerenciar chamadas
3. **Storage Integration**: Gravação em cloud storage
4. **Webhooks**: Notificações de eventos de chamada
5. **Rate Limiting**: Controle de spam de chamadas

---

**Implementado com ❤️ usando GetStream Video SDK**