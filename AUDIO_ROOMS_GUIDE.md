# Sistema de Salas de Áudio - Guia de Implementação

## Visão Geral

Sistema de salas de áudio ao vivo estilo Tandem para comunidades no STP Networking App. Permite que hosts criem salas de áudio onde podem promover membros a speakers ou mantê-los como ouvintes.

## Arquitetura

### Modelo de Dados (Firestore)

**Coleção: `audioRooms`**

```javascript
{
  id: string,                    // ID gerado pelo Firestore
  communityId: string,           // ID da comunidade
  communityName: string,         // Nome da comunidade
  title: string,                 // Título da sala (max 60 chars)
  description?: string,          // Descrição opcional (max 200 chars)
  hostId: string,                // UID do criador
  hostName: string,              // Nome do criador
  hostAvatar?: string,           // Avatar do criador
  status: 'active' | 'ended',    // Status da sala
  participants: [                // Array de participantes
    {
      uid: string,
      name: string,
      avatar?: string,
      role: 'host' | 'speaker' | 'listener',
      isSpeaking: boolean,
      handRaised: boolean
    }
  ],
  speakerIds: string[],          // IDs dos speakers (inclui host)
  listenerIds: string[],         // IDs dos ouvintes
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## Componentes

### 1. CreateAudioRoomModal
**Localização:** `src/components/CreateAudioRoomModal.jsx`

Modal para criar novas salas de áudio.

**Props:**
- `isOpen` (boolean) - Controla visibilidade do modal
- `onClose` (function) - Callback quando modal fecha
- `communityId` (string) - ID da comunidade
- `communityName` (string) - Nome da comunidade

**Funcionalidades:**
- Form com título (obrigatório, max 60 chars)
- Descrição opcional (max 200 chars)
- Validação de campos
- Cria documento no Firestore com host como primeiro participante
- Caixa de informação explicando como funcionam as salas

### 2. AudioRoomCard
**Localização:** `src/components/AudioRoomCard.jsx`

Card visual mostrando sala de áudio ativa.

**Props:**
- `room` (object) - Dados da sala
- `onJoin` (function) - Callback quando usuário clica em "Entrar"

**Design:**
- Fundo gradiente verde (from-green-500 to-green-600)
- Badge "AO VIVO" com ponto vermelho pulsante
- Estatísticas: participantes totais, speakers, tempo decorrido
- Grid de avatares (primeiros 5 participantes)
- Botão "Entrar" branco

### 3. AudioRoomModal
**Localização:** `src/components/AudioRoomModal.jsx`

Modal fullscreen com experiência completa da sala de áudio.

**Props:**
- `room` (object) - Dados iniciais da sala
- `onClose` (function) - Callback quando usuário sai

**Funcionalidades:**

#### Para Todos:
- Visualizar lista de speakers e ouvintes
- Ver avatares e nomes dos participantes
- Indicador visual de quem está falando (anel verde pulsante)
- Sair da sala

#### Para Speakers:
- Botão de mute/unmute (vermelho quando mudo, verde quando ativo)
- Indicador visual ao falar
- Podem ser despromovidos pelo host

#### Para Ouvintes:
- Botão para levantar mão (amarelo quando levantada)
- Animação bounce no ícone de mão levantada
- Podem ser promovidos a speaker pelo host

#### Para Host:
- Todos os controles de speaker
- Painel de moderação ao clicar em participante:
  - Promover ouvinte a speaker
  - Despromover speaker a ouvinte
  - Remover participante (TODO)
- Botão "Encerrar Sala" (deleta documento do Firestore)
- Badge de shield no avatar

**Real-time Sync:**
- Listener do Firestore atualiza estado da sala em tempo real
- Mudanças de participantes refletem imediatamente
- Se sala for encerrada, todos são desconectados

## Integração no CommunityDetailPage

**Localização:** `src/pages/CommunityDetailPage.jsx`

### Mudanças Implementadas:

1. **Botão "Sala de Áudio"** (apenas para owner/mod):
   - Ícone de microfone
   - Cor roxa (bg-purple-600)
   - Abre CreateAudioRoomModal

2. **Listener de Salas Ativas:**
   ```javascript
   useEffect(() => {
     const roomsRef = collection(db, 'audioRooms')
     const q = query(
       roomsRef, 
       where('communityId', '==', id), 
       where('status', '==', 'active')
     )
     const unsub = onSnapshot(q, snap => {
       const rooms = snap.docs.map(d => ({ id: d.id, ...d.data() }))
       setActiveAudioRooms(rooms)
     })
     return () => unsub()
   }, [community, id])
   ```

3. **Renderização de Salas Ativas:**
   - Cards aparecem antes da seção de publicações
   - Cada AudioRoomCard é clicável
   - Abre AudioRoomModal ao clicar em "Entrar"

## Fluxo de Usuário

### Criação de Sala (Host/Mod):
1. Clica em "Sala de Áudio" na página da comunidade
2. Preenche título e descrição
3. Clica em "Criar Sala"
4. Documento criado no Firestore
5. Sala aparece imediatamente para todos os membros
6. Host entra automaticamente como primeiro participante

### Entrar na Sala (Membro):
1. Vê AudioRoomCard com sala ativa
2. Clica em "Entrar"
3. AudioRoomModal abre em fullscreen
4. useEffect adiciona usuário ao array de participantes como 'listener'
5. Listener do Firestore sincroniza mudanças

### Promover a Speaker (Host):
1. Host clica em avatar de ouvinte
2. Modal de ação aparece
3. Clica em "Promover a Speaker"
4. updateDoc atualiza role e move de listenerIds para speakerIds
5. Mudança sincroniza em tempo real para todos

### Levantar Mão (Ouvinte):
1. Ouvinte clica no botão de mão
2. updateDoc atualiza handRaised: true no objeto do participante
3. Ícone de mão aparece no avatar com animação bounce
4. Host vê notificação visual

### Encerrar Sala (Host):
1. Host clica em "Encerrar Sala"
2. deleteDoc remove documento do Firestore
3. Listener do AudioRoomModal detecta que doc não existe
4. Toast "Sala encerrada pelo host"
5. Modal fecha automaticamente para todos

## Funcionalidades Futuras (TODO)

### Fase 2 - Áudio Real:
- [ ] Integrar Stream Audio API ou similar
- [ ] Transmissão de áudio real entre participantes
- [ ] Indicador visual de quem está falando (waveform)
- [ ] Controle de volume individual
- [ ] Qualidade de áudio adaptativa

### Fase 3 - Moderação Avançada:
- [ ] Kick/ban de participantes problemáticos
- [ ] Mute forçado por host
- [ ] Limite de participantes por sala
- [ ] Fila de espera para speakers
- [ ] Tempo limite para speakers

### Fase 4 - Features Adicionais:
- [ ] Reações emoji durante sala (👏, ❤️, 🔥)
- [ ] Gravação de salas (opt-in pelo host)
- [ ] Agendamento de salas futuras
- [ ] Notificações push quando sala começa
- [ ] Histórico de salas passadas
- [ ] Análise de engagement (tempo médio, pico de participantes)

## Segurança e Permissões

### Regras do Firestore (TODO):
```javascript
match /audioRooms/{roomId} {
  // Qualquer membro autenticado pode ler salas ativas
  allow read: if request.auth != null;
  
  // Apenas membros da comunidade podem criar salas
  allow create: if request.auth != null 
    && request.resource.data.hostId == request.auth.uid
    && exists(/databases/$(database)/documents/communities/$(request.resource.data.communityId))
    && get(/databases/$(database)/documents/communities/$(request.resource.data.communityId)).data.members.hasAny([request.auth.uid]);
  
  // Apenas host pode atualizar (promover, despromover, etc)
  allow update: if request.auth != null 
    && (resource.data.hostId == request.auth.uid 
        || request.resource.data.participants[request.auth.uid] != null);
  
  // Apenas host pode deletar (encerrar sala)
  allow delete: if request.auth != null 
    && resource.data.hostId == request.auth.uid;
}
```

## Performance

### Otimizações Implementadas:
- ✅ Real-time listeners apenas para salas ativas (`where('status', '==', 'active')`)
- ✅ Cleanup de listeners no useEffect return
- ✅ Apenas owners/mods veem botão de criar sala
- ✅ Limit de 5 avatares visíveis no AudioRoomCard (+N para resto)

### Considerações:
- Cada sala ativa = 1 listener do Firestore
- Cada usuário em sala = 1 listener adicional
- Para 10 comunidades com salas ativas = 10 listeners simultâneos
- Limite do Firestore: 1 milhão de operações/dia no plano gratuito

## Testes Manuais

### Checklist:
- [ ] Criar sala como owner/mod
- [ ] Título obrigatório, descrição opcional
- [ ] Sala aparece imediatamente após criação
- [ ] Entrar na sala como membro
- [ ] Ver lista de speakers e ouvintes
- [ ] Levantar mão como ouvinte
- [ ] Promover ouvinte a speaker (host)
- [ ] Mute/unmute como speaker
- [ ] Despromover speaker a ouvinte (host)
- [ ] Sair da sala como participante
- [ ] Encerrar sala como host
- [ ] Todos os participantes são desconectados
- [ ] Múltiplas salas na mesma comunidade
- [ ] Real-time sync entre múltiplos navegadores

## Dependências

- Firebase Firestore (onSnapshot, query, where, updateDoc, arrayUnion, arrayRemove)
- date-fns (formatDistanceToNow com locale ptBR)
- lucide-react (ícones: Mic, MicOff, Hand, UserPlus, UserMinus, Shield, X)
- react-hot-toast (notificações)

## Troubleshooting

### "Erro ao entrar na sala"
- Verificar se documento existe no Firestore
- Verificar permissões do Firestore
- Console.log do error para detalhes

### "Sala encerrada pelo host" inesperado
- Listener detectou que documento foi deletado
- Host pode ter encerrado a sala
- Verificar se status mudou para 'ended'

### Participantes não sincronizam
- Verificar se listener do onSnapshot está ativo
- Console.log do snap.docs para ver dados brutos
- Verificar estrutura do documento no Firestore

### Botão de criar sala não aparece
- Verificar se user.uid == community.createdBy
- Verificar se community.roles[user.uid] == 'owner' ou 'mod'
- isOwnerOrMod useMemo pode estar incorreto

---

**Última atualização:** 2025-11-11  
**Versão:** 1.0.0  
**Status:** MVP Completo (sem áudio real)
