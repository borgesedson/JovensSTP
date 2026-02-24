import { useEffect, useState } from 'react'
import { StreamChat } from 'stream-chat'
import { Chat } from 'stream-chat-react'
import { useAuth } from '../hooks/useAuth'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app, db, functions } from '../services/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { StreamContext } from './streamContextValue'

export const StreamProvider = ({ children }) => {
  const { user } = useAuth()
  const [chatClient, setChatClient] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initStreamChat = async () => {
      if (!user) {
        setChatClient(null)
        setLoading(false)
        return
      }

      const apiKey = import.meta.env.VITE_STREAM_API_KEY

      console.log('🔍 Iniciando GetStream Chat...')
      console.log('API Key:', apiKey ? '✅ Configurada' : '❌ Não configurada')

      if (!apiKey) {
        console.error('❌ VITE_STREAM_API_KEY não está configurada no .env')
        setLoading(false)
        return
      }

      try {
        console.log('🔄 Criando cliente GetStream...')
        // Initialize Stream Chat client with increased timeout
        const client = StreamChat.getInstance(apiKey, {
          timeout: 10000, // 10 segundos ao invés de 3 (default)
        })

        console.log('🔄 Chamando Cloud Function para gerar token...')
        // Use central functions instance
        let streamToken;

        try {
          // Attempting v4 name
          const createStreamToken = httpsCallable(functions, 'v4_createUserStreamToken')
          console.log('📡 Chamando v4_createUserStreamToken com UID:', user.uid)
          const response = await createStreamToken({
            userId: user.uid,
            userName: user.displayName || 'Usuário'
          })

          if (response.data && (response.data.streamToken || response.data.token)) {
            streamToken = response.data.streamToken || response.data.token
            console.log('✅ Token recebido da Cloud Function')
          } else {
            console.warn('⚠️ Resposta incompleta da Cloud Function, tentando fallback v3...')
            const createStreamTokenV3 = httpsCallable(functions, 'createUserStreamToken')
            const responseV3 = await createStreamTokenV3({ userId: user.uid })
            streamToken = responseV3.data.token
          }

          if (!streamToken) {
            throw new Error('Nenhum token retornado pelas funções')
          }
        } catch (error) {
          console.warn('⚠️ Falha ao obter token das Cloud Functions:', error.message)
          // Don't set mock immediately, check if we have a locally stored one or similar
          streamToken = 'dev_chat_token_mock'
        }

        // Connect user to Stream Chat
        const safeImage =
          user.photoURL && !String(user.photoURL).startsWith('data:')
            ? user.photoURL
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=16a34a&color=fff`

        try {
          console.log('🔄 Tentando client.connectUser para:', user.uid)
          if (streamToken === 'dev_chat_token_mock') {
            console.warn('🚫 Conexão abortada: token é um mock. Verifique os logs da Cloud Function.')
            setChatClient(null)
            setLoading(false)
            return
          }

          await client.connectUser(
            {
              id: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'Usuário',
              image: safeImage,
            },
            streamToken
          )
          console.log('✅ GetStream Chat connected successfully')
          setChatClient(client)

          // ✅ NOVO: Registrar dispositivo para Push Notifications nativo (Stream -> FCM)
          const registerNativePush = async () => {
            try {
              // Verifica permissão. Se não tiver, não faz nada mas fica pronto para quando tiver.
              const { registerForPush } = await import('../services/notifications')
              const fcmToken = await registerForPush(user.uid)

              if (fcmToken) {
                console.log('📡 Registrando dispositivo no Stream Chat (Native Push)...')
                await client.addDevice(fcmToken, 'firebase', user.uid, 'Firebase')
                console.log('✅ Dispositivo registrado com sucesso no Stream.')
              } else {
                console.log('ℹ️ Registro de Push pendente (sem token ou permissão).')
              }
            } catch (pushErr) {
              console.warn('⚠️ Falha ao registrar dispositivo no Stream (Native Push):', pushErr)
              // Tentativa de fallback: Se falhar com 4 argumentos, tentar com 3 (token, type, providerName)
              // Isso pode acontecer se o SDK inferir o userID do cliente conectado e tratar o 3º argumento como nome do provedor
              try {
                if (pushErr.message && (pushErr.message.includes('push provider ""') || pushErr.message.includes('provider not found'))) {
                  console.log('🔄 Tentando registrar com assinatura alternativa (sem userID explícito)...');
                  await client.addDevice(fcmToken, 'firebase', 'Firebase');
                  console.log('✅ Dispositivo registrado com sucesso no Stream (Fallback).');
                }
              } catch (fallbackErr) {
                console.warn('⚠️ Falha definitiva no registro de push:', fallbackErr);
              }
            }
          }
          registerNativePush()
        } catch (connErr) {
          console.error('❌ Erro CRÍTICO ao conectar ao Stream Chat:', connErr)
          setChatClient(null)
          const toast = (await import('react-hot-toast')).default;
          toast.error('Ocorreu um erro ao conectar ao chat. Por favor, tente novamente mais tarde.');
        }

        // Listener para novas mensagens (notificações)
        // DESABILITADO: Causava erro com channelType undefined
        // O sistema de email (CustomMessageInput) já cuida das notificações
        /*
        client.on('message.new', async (event) => {
          // Ignorar mensagens do próprio usuário
          if (event.user?.id === user.uid) return

          try {
            const channelType = event.channel?.type
            const channelId = event.channel?.id
            const senderName = event.user?.name || 'Alguém'
            const messageText = event.message?.text || 'Nova mensagem'

            // Detectar se é comunidade
            const isCommunity = channelId?.startsWith('community-')
            const communityId = isCommunity ? channelId.replace('community-', '') : null
            const channelName = event.channel?.data?.name || 'Canal'

            // Criar notificação no Firestore (subcoleção usada pelo badge)
            await addDoc(collection(db, 'notifications', user.uid, 'items'), {
              type: 'message',
              message: (isCommunity ? `Nova mensagem em ${channelName}: ` : `Mensagem de ${senderName}: `) + messageText.substring(0, 100),
              read: false,
              timestamp: serverTimestamp(),
              link: isCommunity && communityId
                ? `/communities/${communityId}`
                : '/chat',
              metadata: {
                channelType,
                channelId,
                senderId: event.user?.id,
                senderName,
                isCommunity,
              }
            })

            console.log('✅ Notificação criada para nova mensagem')
          } catch (error) {
            console.error('Erro ao criar notificação:', error)
          }
        })
        */

      } catch (error) {
        console.error('Error connecting to Stream Chat:', error)
      } finally {
        setLoading(false)
      }
    }

    initStreamChat()

    // Cleanup on unmount
    return () => {
      if (chatClient) {
        chatClient.disconnectUser().catch(console.error)
        setChatClient(null)
      }
    }
  }, [user?.uid, user?.displayName, user?.photoURL])

  // Helper function para criar canal 1-on-1
  const createChannel = async (otherUserId, otherUserName) => {
    if (!chatClient || !user) {
      throw new Error('Chat client não inicializado')
    }

    try {
      // ✅ NOVO: Garantir que o outro usuário existe no Stream antes de criar canal
      try {
        console.log('📡 Chamando v4_ensureStreamUsers para:', otherUserId)
        const ensureUserFn = httpsCallable(functions, 'v4_ensureStreamUsers')
        const result = await ensureUserFn({ userIds: [otherUserId] })
        console.log('✅ Resultado da sincronização:', result.data)
      } catch (ensureErr) {
        console.warn('⚠️ Falha ao garantir existência do usuário no Stream (pode ser CORS ou erro interno):', ensureErr)
        // Continuamos mesmo assim, o Stream pode já ter o usuário
      }

      // Cria ID único para o canal (ordenado alfabeticamente para consistência)
      const members = [user.uid, otherUserId].sort()
      const channelId = `chat-${members.join('-')}`

      // Verifica se já existe um canal com esses membros
      const filter = {
        type: 'messaging',
        members: { $eq: members },
      }

      const existingChannels = await chatClient.queryChannels(filter, {}, { limit: 1 })

      // Se já existe, retorna o ID do canal existente
      if (existingChannels.length > 0) {
        console.log('✅ Canal existente encontrado:', existingChannels[0].id)
        return existingChannels[0].id
      }

      // Caso contrário, cria ou obtém canal novo
      const channel = chatClient.channel('messaging', channelId, {
        members: members,
      })

      await channel.watch()

      console.log('✅ Novo canal criado:', channelId)
      return channelId
    } catch (error) {
      console.error('Erro ao criar canal:', error)
      throw error
    }
  }

  return (
    <StreamContext.Provider value={{ chatClient, loading, createChannel }}>
      {chatClient ? (
        <Chat client={chatClient} theme="str-chat__theme-light">
          {children}
        </Chat>
      ) : children}
    </StreamContext.Provider>
  )
}
