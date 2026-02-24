import React from "react"
import Modal from "./Modal"

/**
 * Modal para exibir imagem ou vídeo em tela cheia
 * Props:
 * - isOpen: boolean
 * - onClose: function
 * - src: string (url da mídia)
 * - type: 'image' | 'video'
 * - alt: string (opcional)
 */
const MediaViewerModal = ({ isOpen, onClose, src, type, alt }) => {
  if (!isOpen) return null
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col items-center justify-center w-[90vw] h-[90vh] bg-white rounded-xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/80 hover:bg-white rounded-full shadow"
          title="Fechar"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        {type === 'image' ? (
          <img
            src={src}
            alt={alt || 'Mídia'}
            className="max-w-full max-h-full object-contain rounded-xl"
            style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}
          />
        ) : (
          <video
            src={src}
            controls
            autoPlay
            className="max-w-full max-h-full object-contain rounded-xl"
            style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}
          />
        )}
      </div>
    </Modal>
  )
}

export default MediaViewerModal
