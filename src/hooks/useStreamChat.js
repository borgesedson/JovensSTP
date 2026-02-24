import { useContext } from 'react'
import { StreamContext } from '../contexts/streamContextValue'

export const useStreamChat = () => {
  const context = useContext(StreamContext)
  if (context === undefined) {
    throw new Error('useStreamChat must be used within StreamProvider')
  }
  return context
}
