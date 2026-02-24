import { useState, useEffect, useRef } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { db } from '../services/firebase'
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDoc, doc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore'
import { useAuth } from '../hooks/useAuth'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { Guardian } from '../utils/securityUtils'

export const CommentsSection = ({ postId, isOpen, onClose, commentCount }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingComments, setLoadingComments] = useState(true)
  const [replyTo, setReplyTo] = useState(null) // id do comentário que está sendo respondido
  const [replyText, setReplyText] = useState('')
  const replyInputRef = useRef(null)
  // Edição de comentário
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  // Autocomplete de menção
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionResults, setMentionResults] = useState([])
  const [showMentions, setShowMentions] = useState(false)
  const [mentionIndex, setMentionIndex] = useState(0)

  // Load comments in real-time
  // Carregar comentários e replies em tempo real
  useEffect(() => {
    if (!isOpen || !postId) {
      setComments([])
      setLoadingComments(false)
      return
    }
    setLoadingComments(true)
    const commentsRef = collection(db, 'stories', postId, 'comments')
    const q = query(commentsRef, orderBy('timestamp', 'asc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Organiza comentários e replies em árvore
      const flat = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      const map = {}
      flat.forEach(c => { map[c.id] = { ...c, replies: [] } })
      const tree = []
      flat.forEach(c => {
        if (c.parentId) {
          if (map[c.parentId]) map[c.parentId].replies.push(map[c.id])
        } else {
          tree.push(map[c.id])
        }
      })
      setComments(tree)
      setLoadingComments(false)
    })
    return () => unsubscribe()
  }, [isOpen, postId])

  // Extrai menções do texto (ex: @nome)
  function extractMentions(text) {
    const regex = /@([\wÀ-ÿ\-. ]+)/g
    const matches = []
    let match
    while ((match = regex.exec(text))) {
      matches.push(match[1].trim())
    }
    return matches
  }

  // Enviar comentário ou reply com menções
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editingId) {
      // Salvar edição
      if (!editText.trim()) {
        toast.error('Comentário não pode ser vazio')
        return
      }
      setLoading(true)
      try {
        const mentionNames = extractMentions(editText)
        let mentionUids = []
        if (mentionNames.length > 0) {
          const usersRef = collection(db, 'users')
          const usersSnap = await getDocs(usersRef)
          const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          mentionUids = users.filter(u => mentionNames.includes(u.displayName)).map(u => u.id)
        }
        const commentRef = doc(db, 'stories', postId, 'comments', editingId)
        await updateDoc(commentRef, {
          text: editText.trim(),
          mentions: Array.isArray(mentionUids) ? mentionUids : []
        })
        setEditingId(null)
        setEditText('')
        toast.success('Comentário editado!')
      } catch (error) {
        console.error('Erro ao editar comentário:', error)
        toast.error('Erro ao editar comentário')
      } finally {
        setLoading(false)
      }
      return
    }
    const text = replyTo ? replyText : newComment
    if (!text.trim()) {
      toast.error('Escreve um comentário!')
      return
    }

    // Guardian Security Check
    const checkText = Guardian.validateText(text);
    if (!checkText.clean) {
      toast.error('⚠️ Conteúdo impróprio detetado no comentário! Por favor, sê respeitoso e foca-te na educação.');
      console.warn('[Guardian] Comment blocked:', { text, found: checkText.found });
      return;
    }

    setLoading(true)
    try {
      // Buscar uids das menções
      const mentionNames = extractMentions(text)
      let mentionUids = []
      if (mentionNames.length > 0) {
        const usersRef = collection(db, 'users')
        const usersSnap = await getDocs(usersRef)
        const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        mentionUids = users.filter(u => mentionNames.includes(u.displayName)).map(u => u.id)
      }
      const commentsRef = collection(db, 'stories', postId, 'comments')
      await addDoc(commentsRef, {
        text: text.trim(),
        authorId: user.uid,
        authorName: user.displayName || 'Usuário',
        authorAvatar: user.photoURL || null,
        timestamp: serverTimestamp(),
        parentId: replyTo || null,
        mentions: mentionUids
      })
      // Buscar o autor do post para notificar
      const postRef = doc(db, 'stories', postId)
      const postDoc = await getDoc(postRef)
      const postData = postDoc.data()
      // Notificar o autor do post (se não for você mesmo)
      if (!replyTo && postData && postData.authorId && postData.authorId !== user.uid) {
        const notifRef = collection(db, 'notifications', postData.authorId, 'items')
        await addDoc(notifRef, {
          type: 'comment',
          message: `${user.displayName} comentou na tua publicação`,
          link: '/',
          read: false,
          timestamp: new Date()
        })
      }
      // Notificar autor do comentário respondido (reply)
      if (replyTo) {
        const parentComment = comments.flatMap(flattenComments).find(c => c.id === replyTo)
        if (parentComment && parentComment.authorId !== user.uid) {
          const notifRef = collection(db, 'notifications', parentComment.authorId, 'items')
          await addDoc(notifRef, {
            type: 'reply',
            message: `${user.displayName} respondeu seu comentário`,
            link: '/',
            read: false,
            timestamp: new Date()
          })
        }
      }
      // Notificar usuários mencionados (exceto o próprio autor)
      for (const uid of mentionUids) {
        if (uid !== user.uid) {
          const notifRef = collection(db, 'notifications', uid, 'items')
          await addDoc(notifRef, {
            type: 'mention',
            message: `${user.displayName} te mencionou em um comentário`,
            link: '/',
            read: false,
            timestamp: new Date()
          })
        }
      }
      if (replyTo) {
        setReplyText('')
        setReplyTo(null)
      } else {
        setNewComment('')
      }
      setShowMentions(false)
      setMentionResults([])
      toast.success('Comentário adicionado!')
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error)
      toast.error('Erro ao comentar')
    } finally {
      setLoading(false)
    }
  }

  // Apagar comentário
  const handleDelete = async (commentId) => {
    if (!window.confirm('Tem certeza que deseja apagar este comentário?')) return
    setLoading(true)
    try {
      const commentRef = doc(db, 'stories', postId, 'comments', commentId)
      await deleteDoc(commentRef)
      toast.success('Comentário apagado!')
    } catch (error) {
      toast.error('Erro ao apagar comentário')
    } finally {
      setLoading(false)
    }
  }

  // Função para "achatar" árvore de comentários para busca
  function flattenComments(tree) {
    if (!Array.isArray(tree)) return [];
    return tree.reduce((acc, c) => [
      ...acc,
      c,
      ...(c.replies ? flattenComments(c.replies) : [])
    ], []);
  }

  if (!isOpen) return null

  // Renderização recursiva de comentários e replies
  const renderComments = (commentsList, level = 0) => (
    commentsList.map((comment) => (
      <div key={comment.id} className={`flex gap-3 ${level > 0 ? 'ml-8' : ''}`}>
        {/* Avatar */}
        <div
          className="cursor-pointer"
          onClick={() => {
            navigate(`/profile/${comment.authorId}`)
            onClose()
          }}
        >
          {comment.authorAvatar ? (
            <img
              src={comment.authorAvatar}
              alt={comment.authorName}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0 hover:opacity-80 transition"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold flex-shrink-0 hover:opacity-80 transition">
              {comment.authorName?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
        </div>
        {/* Conteúdo do comentário */}
        <div className="flex-1">
          <div className="bg-gray-100 rounded-lg p-3 relative">
            <p
              className="font-semibold text-sm hover:text-green-600 cursor-pointer transition inline"
              onClick={() => {
                navigate(`/profile/${comment.authorId}`)
                onClose()
              }}
            >
              {comment.authorName}
            </p>
            {editingId === comment.id ? (
              <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none"
                  disabled={loading}
                  autoFocus
                />
                <button type="submit" className="text-green-600 font-semibold" disabled={loading}>Salvar</button>
                <button type="button" className="text-gray-400 ml-1" onClick={() => { setEditingId(null); setEditText('') }}>Cancelar</button>
              </form>
            ) : (
              <p className="text-gray-800 mt-1">{comment.text}</p>
            )}
            {/* Botões editar/apagar para o autor */}
            {comment.authorId === user?.uid && editingId !== comment.id && (
              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  className="text-xs text-blue-500 hover:underline"
                  onClick={() => { setEditingId(comment.id); setEditText(comment.text) }}
                  disabled={loading}
                >Editar</button>
                <button
                  className="text-xs text-red-500 hover:underline"
                  onClick={() => handleDelete(comment.id)}
                  disabled={loading}
                >Apagar</button>
              </div>
            )}
          </div>
          {comment.timestamp && (
            <p className="text-xs text-gray-500 mt-1 ml-3">
              {formatDistanceToNow(comment.timestamp.toDate(), {
                addSuffix: true,
                locale: ptBR
              })}
            </p>
          )}
          {/* Botão responder */}
          <button
            className="text-xs text-green-600 mt-1 ml-2 hover:underline"
            onClick={() => {
              setReplyTo(comment.id)
              setReplyText(prev => {
                const mention = `@${comment.authorName} `
                if (prev.startsWith(mention)) return prev
                return mention
              })
              setTimeout(() => {
                if (replyInputRef.current) {
                  replyInputRef.current.focus()
                  replyInputRef.current.setSelectionRange(replyInputRef.current.value.length, replyInputRef.current.value.length)
                }
              }, 100)
            }}
          >
            Responder
          </button>
          {/* Replies recursivos */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              {renderComments(comment.replies, level + 1)}
            </div>
          )}
        </div>
      </div>
    ))
  )

  // Função para detectar @ e buscar usuários
  const handleInputChange = async (e, isReply = false) => {
    const value = e.target.value
    if (isReply) setReplyText(value)
    else setNewComment(value)
    // Detectar @
    const cursor = e.target.selectionStart
    const textUntilCursor = value.slice(0, cursor)
    const match = /@([\wÀ-ÿ\-. ]*)$/.exec(textUntilCursor)
    if (match && match[1].length >= 1) {
      setMentionQuery(match[1])
      setShowMentions(true)
      setMentionIndex(0)
      // Buscar usuários
      const usersRef = collection(db, 'users')
      const usersSnap = await getDocs(usersRef)
      const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      const filtered = users.filter(u =>
        u.displayName && u.displayName.toLowerCase().includes(match[1].toLowerCase()) && u.id !== user.uid
      ).slice(0, 5)
      setMentionResults(filtered)
    } else {
      setShowMentions(false)
      setMentionResults([])
    }
  }

  // Inserir menção ao selecionar usuário
  const handleMentionSelect = (mention, isReply = false) => {
    const value = isReply ? replyText : newComment
    const cursor = (isReply ? replyInputRef.current?.selectionStart : null) || value.length
    const textUntilCursor = value.slice(0, cursor)
    const match = /@([\wÀ-ÿ\-. ]*)$/.exec(textUntilCursor)
    if (!match) return
    const before = value.slice(0, match.index)
    const after = value.slice(cursor)
    const newValue = before + '@' + mention.displayName + ' ' + after
    if (isReply) setReplyText(newValue)
    else setNewComment(newValue)
    setShowMentions(false)
    setMentionResults([])
  }

  // Navegação por teclado no autocomplete
  const handleInputKeyDown = (e, isReply = false) => {
    if (showMentions && mentionResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex(i => (i + 1) % mentionResults.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex(i => (i - 1 + mentionResults.length) % mentionResults.length)
      } else if (e.key === 'Enter') {
        if (mentionResults[mentionIndex]) {
          e.preventDefault()
          handleMentionSelect(mentionResults[mentionIndex], isReply)
        }
      } else if (e.key === 'Escape') {
        setShowMentions(false)
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full sm:max-w-lg flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle className="text-green-600" size={20} />
            <h3 className="font-semibold">
              Comentários {commentCount > 0 && `(${commentCount})`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>
        {/* Lista de comentários aninhados */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: 0, scrollBehavior: 'smooth' }}>
          {loadingComments ? (
            <div className="text-center py-8 text-gray-500">
              Carregando comentários...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum comentário ainda. Seja o primeiro!
            </div>
          ) : (
            renderComments(comments)
          )}
        </div>
        {/* Formulário de input principal ou reply */}
        <form onSubmit={handleSubmit} className="border-t p-4 bg-white flex-shrink-0 relative">
          <div className="flex gap-2 items-center">
            {/* Avatar do usuário */}
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                {user?.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            {/* Input principal ou de reply */}
            {replyTo ? (
              <input
                ref={replyInputRef}
                type="text"
                value={replyText}
                onChange={e => handleInputChange(e, true)}
                onKeyDown={e => handleInputKeyDown(e, true)}
                placeholder="Responder comentário..."
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={loading}
                autoComplete="off"
              />
            ) : (
              <input
                type="text"
                value={newComment}
                onChange={e => handleInputChange(e, false)}
                onKeyDown={e => handleInputKeyDown(e, false)}
                placeholder="Escreve um comentário..."
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={loading}
                autoComplete="off"
              />
            )}
            {/* Botão enviar */}
            <button
              type="submit"
              disabled={loading || !(replyTo ? replyText.trim() : newComment.trim())}
              className="p-2.5 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:bg-gray-300 transition flex-shrink-0"
            >
              <Send size={20} />
            </button>
            {/* Cancelar reply */}
            {replyTo && (
              <button
                type="button"
                className="ml-2 text-xs text-gray-500 hover:text-red-500"
                onClick={() => { setReplyTo(null); setReplyText('') }}
              >
                Cancelar
              </button>
            )}
          </div>
          {/* Autocomplete de menção */}
          {showMentions && mentionResults.length > 0 && (
            <div className="absolute left-16 right-4 bottom-16 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
              {mentionResults.map((u, i) => (
                <div
                  key={u.id}
                  className={`flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-green-50 ${i === mentionIndex ? 'bg-green-100' : ''}`}
                  onMouseDown={e => { e.preventDefault(); handleMentionSelect(u, !!replyTo) }}
                >
                  {u.photoURL ? (
                    <img src={u.photoURL} alt={u.displayName} className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-green-400 text-white flex items-center justify-center font-bold">
                      {u.displayName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className="font-medium">{u.displayName}</span>
                </div>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
