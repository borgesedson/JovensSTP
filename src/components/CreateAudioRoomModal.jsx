import { useState } from 'react';
import { X, Mic } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export const CreateAudioRoomModal = ({ isOpen, onClose, communityId, communityName }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Adiciona um título para a sala');
      return;
    }

    setLoading(true);
    try {
      const roomData = {
        communityId,
        communityName,
        title: title.trim(),
        description: description.trim(),
        hostId: user.uid,
        hostName: user.displayName || 'Host',
        hostAvatar: user.photoURL || null,
        status: 'active',
        participants: [{
          uid: user.uid,
          name: user.displayName || 'Host',
          avatar: user.photoURL || null,
          role: 'host',
          isSpeaking: false,
          handRaised: false
        }],
        speakerIds: [user.uid],
        listenerIds: [],
        createdAt: serverTimestamp(),
        startedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'audioRooms'), roomData);
      
      toast.success('Sala de áudio criada! 🎙️');
      setTitle('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Erro ao criar sala:', error);
      toast.error('Erro ao criar sala de áudio');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Criar Sala de Áudio</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título da sala *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Networking de Carreira"
              maxLength={60}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreve do que vais falar..."
              rows="3"
              maxLength={200}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Mic className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-900 mb-1">Como funciona?</p>
                <ul className="text-green-700 space-y-1">
                  <li>• Tu serás o host da sala</li>
                  <li>• Participantes podem entrar e ouvir</li>
                  <li>• Podes dar permissão para falar</li>
                  <li>• A sala fecha quando saíres</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'A criar...' : 'Criar Sala'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
