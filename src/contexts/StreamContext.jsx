import { useEffect, useState, useMemo, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { StreamChat } from 'stream-chat'
import { Chat } from 'stream-chat-react'
import { useAuth } from '../hooks/useAuth'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../services/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { StreamContext } from './streamContextValue'
import { registerForPush, setupForegroundNotifications } from '../services/notifications'
import { getMessagingInstance } from '../services/firebase'

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
        const client = StreamChat.getInstance(apiKey, {
          timeout: 10000,
        })

        // ✅ FIX: Buscar nome real do Firestore ANTES de qualquer coisa
        let realName = user.displayName
        let realPhoto = user.photoURL

        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            const data = userDoc.data()
            realName = realName
              || data.displayName
              || data.name
              || data.username
              || data.fullName
              || user.email?.split('@')[0]
              || 'Utilizador'
            realPhoto = realPhoto || data.photoURL || data.avatar || null
          } else {
            realName = realName || user.email?.split('@')[0] || 'Utilizador'
          }
        } catch (e) {
          console.warn('⚠️ Não foi possível buscar perfil do Firestore:', e)
          realName = realName || user.email?.split('@')[0] || 'Utilizador'
        }

        console.log('👤 Nome real encontrado:', realName)

        // Imagem segura com nome real
        const safeImage =
          realPhoto && !String(realPhoto).startsWith('data:')
            ? realPhoto
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(realName)}&background=16a34a&color=fff`

        // Gerar token via Cloud Function
        console.log('🔄 Chamando Cloud Function para gerar token...')
        let streamToken

        try {
          const createStreamToken = httpsCallable(functions, 'v4_createUserStreamToken')
          console.log('📡 Chamando v4_createUserStreamToken com UID:', user.uid)
          const response = await createStreamToken({
            userId: user.uid,
            userName: realName,
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
          streamToken = 'dev_chat_token_mock'
        }

        // Conectar ao Stream com nome real
        try {
          console.log('🔄 Tentando client.connectUser para:', user.uid)

          if (streamToken === 'dev_chat_token_mock') {
            console.warn('🚫 Conexão abortada: token é um mock.')
            setChatClient(null)
            setLoading(false)
            return
          }

          await client.connectUser(
            {
              id: user.uid,
              name: realName,
              image: safeImage,
            },
            streamToken
          )
          console.log('✅ GetStream Chat connected — nome:', realName)
          setChatClient(client)

          // Notificações foreground
          registerForPush(user.uid).then(token => {
            if (token) console.log('🔔 Push registration complete')
          })

          getMessagingInstance().then(messaging => {
            if (messaging) {
              setupForegroundNotifications(messaging, (url) => {
                window.location.href = url
              })
            }
          })

          // Registar dispositivo para push no Stream Chat (FCM)
          const registerNativePush = async () => {
            try {
              const fcmToken = await registerForPush(user.uid)
              if (fcmToken) {
                console.log('📡 Registrando dispositivo no Stream Chat...')
                await client.addDevice(fcmToken, 'firebase', user.uid)
                console.log('✅ Dispositivo registrado no Stream.')
              }
            } catch (pushErr) {
              console.warn('⚠️ Falha ao registrar dispositivo no Stream:', pushErr)
            }
          }
          registerNativePush()

        } catch (connErr) {
          console.error('❌ Erro CRÍTICO ao conectar ao Stream Chat:', connErr)
          setChatClient(null)
          const toast = (await import('react-hot-toast')).default
          toast.error('Ocorreu um erro ao conectar ao chat. Por favor, tente novamente mais tarde.')
        }

      } catch (error) {
        console.error('Error connecting to Stream Chat:', error)
      } finally {
        setLoading(false)
      }
    }

    initStreamChat()

    return () => {
      if (chatClient) {
        chatClient.disconnectUser().catch(console.error)
        setChatClient(null)
      }
    }
  }, [user?.uid, user?.displayName, user?.photoURL])

  // Criar canal 1-on-1 via Backend
  const createChannel = useCallback(async (otherUserId) => {
    if (!chatClient || !user) {
      throw new Error('Chat client não inicializado')
    }

    try {
      console.log('📡 Iniciando criação de canal via Backend para:', otherUserId)
      const createChannelFn = httpsCallable(functions, 'v4_createDirectChannel')
      const result = await createChannelFn({ otherUserId })

      if (result.data?.success && result.data?.channelId) {
        console.log('✅ Canal criado/recuperado via Backend:', result.data.channelId)
        const channel = chatClient.channel('messaging', result.data.channelId)
        await channel.watch()
        return result.data.channelId
      }

      throw new Error('Falha na resposta do backend para criação de canal')
    } catch (error) {
      console.error('❌ Erro crítico ao criar canal:', error)
      toast.error('Erro ao iniciar chat. Tente novamente.')
      throw error
    }
  }, [chatClient, user])

  const value = useMemo(() => ({
    chatClient,
    loading,
    createChannel
  }), [chatClient, loading, createChannel])

  return (
    <StreamContext.Provider value={value}>
      {chatClient ? (
        <Chat client={chatClient} theme="str-chat__theme-light">
          {children}
        </Chat>
      ) : children}
    </StreamContext.Provider>
  )
}