import React, { useState } from 'react'

export const EditPostModal = ({ isOpen, initialContent, onSave, onCancel, loading }) => {
  const [content, setContent] = useState(initialContent || '')

  // Atualiza o conteúdo se o post mudar
  React.useEffect(() => {
    setContent(initialContent || '')
  }, [initialContent])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg mx-2">
        <h2 className="text-lg font-semibold mb-4">Editar publicação</h2>
        <textarea
          className="w-full border border-gray-300 rounded-lg p-3 mb-4 min-h-[100px] focus:ring-2 focus:ring-green-500 outline-none"
          value={content}
          onChange={e => setContent(e.target.value)}
          disabled={loading}
        />
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
            onClick={onCancel}
            disabled={loading}
          >Cancelar</button>
          <button
            className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
            onClick={() => onSave(content)}
            disabled={loading || !content.trim()}
          >Salvar</button>
        </div>
      </div>
    </div>
  )
}
