import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuth } from '../hooks/useAuth'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const ViewStoryModal = ({ stories, initialIndex = 0, onClose }) => {
  const { user } = useAuth()
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [progress, setProgress] = useState(0)

  const currentStory = stories[currentIndex]

  // Mark story as viewed
  useEffect(() => {
    if (!currentStory || !user) return

    const markAsViewed = async () => {
      if (!currentStory.views?.includes(user.uid)) {
        try {
          await updateDoc(doc(db, 'userStories', currentStory.id), {
            views: arrayUnion(user.uid)
          })
        } catch (error) {
          console.error('Erro ao marcar story como visto:', error)
        }
      }
    }

    markAsViewed()
  }, [currentStory, user])

  // Auto-advance story
  useEffect(() => {
    setProgress(0)
    const duration = 5000 // 5 seconds
    const interval = 50
    const increment = (interval / duration) * 100

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex(currentIndex + 1)
          } else {
            onClose()
          }
          return 0
        }
        return prev + increment
      })
    }, interval)

    return () => clearInterval(timer)
  }, [currentIndex, stories.length, onClose])

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      onClose()
    }
  }

  if (!currentStory) return null

  const timeAgo = currentStory.createdAt
    ? formatDistanceToNow(currentStory.createdAt.toDate(), { addSuffix: true, locale: ptBR })
    : 'agora'

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
        {stories.map((_, idx) => (
          <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all"
              style={{
                width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-3">
          {currentStory.userAvatar ? (
            <img
              src={currentStory.userAvatar}
              alt={currentStory.userName}
              className="w-10 h-10 rounded-full border-2 border-white object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full border-2 border-white bg-green-500 flex items-center justify-center text-white font-bold">
              {currentStory.userName?.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-white font-semibold text-sm">{currentStory.userName}</p>
            <p className="text-white/80 text-xs">{timeAgo}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
        >
          <X size={24} className="text-white" />
        </button>
      </div>

      {/* Story Image */}
      <div className="flex-1 flex items-center justify-center relative">
        <img
          src={currentStory.imageUrl}
          alt="Story"
          className="max-w-full max-h-full object-contain"
        />

        {/* Navigation areas */}
        <button
          onClick={handlePrevious}
          className="absolute left-0 top-0 bottom-0 w-1/3 flex items-center justify-start pl-4 opacity-0 hover:opacity-100 transition-opacity"
          disabled={currentIndex === 0}
        >
          {currentIndex > 0 && (
            <ChevronLeft size={40} className="text-white drop-shadow-lg" />
          )}
        </button>
        <button
          onClick={handleNext}
          className="absolute right-0 top-0 bottom-0 w-1/3 flex items-center justify-end pr-4 opacity-0 hover:opacity-100 transition-opacity"
        >
          <ChevronRight size={40} className="text-white drop-shadow-lg" />
        </button>
      </div>

      {/* Views count (only for own stories) */}
      {currentStory.userId === user?.uid && (
        <div className="absolute bottom-4 left-0 right-0 px-4 z-10">
          <div className="bg-white/20 backdrop-blur-md rounded-full px-4 py-2 text-white text-sm text-center">
            👁️ {currentStory.views?.length || 0} {currentStory.views?.length === 1 ? 'visualização' : 'visualizações'}
          </div>
        </div>
      )}
    </div>
  )
}
