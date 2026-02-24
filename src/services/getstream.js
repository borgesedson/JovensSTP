import { StreamChat } from 'stream-chat'

// TODO: Replace with your GetStream config
const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY

export const createStreamClient = () => {
  if (!STREAM_API_KEY) {
    throw new Error('VITE_STREAM_API_KEY is not defined')
  }
  return StreamChat.getInstance(STREAM_API_KEY)
}

export const connectStreamUser = async (client, userId, userName, token) => {
  if (client.userID) {
    return // Already connected
  }
  await client.connectUser(
    {
      id: userId,
      name: userName,
    },
    token
  )
}

export const disconnectStreamUser = async (client) => {
  if (client.userID) {
    await client.disconnectUser()
  }
}
