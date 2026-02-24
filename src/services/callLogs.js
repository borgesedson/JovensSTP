// Serviço para registrar chamadas no chat

/**
 * Envia mensagem de sistema no chat sobre a chamada
 * @param {Object} channelId - ID do canal do chat
 * @param {Object} callData - Dados da chamada (tipo, duração, status)
 */
export const sendCallLogMessage = async (client, targetUserId, callData) => {
  try {
    if (!client) {
      console.warn('Cliente do chat não disponível')
      return
    }

    // Criar ou buscar canal 1-on-1
    const channel = client.channel('messaging', {
      members: [client.userID, targetUserId],
    })

    await channel.watch()

    // Formatar mensagem baseada no status
    let messageText = ''
    const { type, duration, status, callerName } = callData

    const callTypeText = type === 'audio' ? '📞 Chamada de áudio' : '📹 Chamada de vídeo'

    if (status === 'completed' && duration > 0) {
      // Chamada atendida e concluída
      const minutes = Math.floor(duration / 60)
      const seconds = duration % 60

      if (minutes > 0) {
        messageText = `${callTypeText} - Duração: ${minutes}min ${seconds}s`
      } else {
        messageText = `${callTypeText} - Duração: ${seconds}s`
      }
    } else if (status === 'missed') {
      // Chamada não atendida
      messageText = `${callTypeText} - Não atendida`
    } else if (status === 'declined') {
      // Chamada recusada
      messageText = `${callTypeText} - Recusada`
    } else if (status === 'cancelled') {
      // Chamada cancelada pelo caller
      messageText = `${callTypeText} - Cancelada`
    } else if (status === 'failed') {
      // Falha na conexão
      messageText = `${callTypeText} - Falha na conexão`
    }

    // Enviar mensagem como system message
    await channel.sendMessage({
      text: messageText,
      type: 'system',
      customType: 'call_log',
      call_data: {
        type,
        duration,
        status,
        timestamp: new Date().toISOString()
      }
    })

    console.log('✅ Log de chamada registrado no chat:', messageText)
  } catch (error) {
    console.error('❌ Erro ao registrar log de chamada:', error)
  }
}

/**
 * Hook para rastrear duração de chamada
 */
export const useCallDuration = () => {
  let startTime = null

  const start = () => {
    startTime = Date.now()
  }

  const getElapsedSeconds = () => {
    if (!startTime) return 0
    return Math.floor((Date.now() - startTime) / 1000)
  }

  const reset = () => {
    startTime = null
  }

  return { start, getElapsedSeconds, reset }
}
