import { User, Briefcase, MapPin, Star, MessageCircle, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStreamChat } from '../hooks/useStreamChat';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { formatSkills } from '../utils/formatters';
import { JobDetailsModal } from './JobDetailsModal';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

const DiscoverCard = ({ item, type, onConnect }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createChannel } = useStreamChat();
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);
  const [showJobModal, setShowJobModal] = useState(false);
  const [connectionRequest, setConnectionRequest] = useState(null); // { type: 'sent'|'received', id: string } | null
  const [requestId, setRequestId] = useState(null);

  // Verifica se já existe conexão ou pedido pendente
  useEffect(() => {
    const checkConnectionStatus = async () => {
      if (!user || !item.uid) {
        setCheckingConnection(false);
        return;
      }

      try {
        // Verificar se já está conectado (following bilateral)
        if (user.following?.includes(item.uid)) {
          setIsConnected(true);
          setCheckingConnection(false);
          return;
        }

        // Verificar se há pedido pendente enviado
        const sentSnapshot = await getDocs(
          query(
            collection(db, 'connectionRequests'),
            where('from', '==', user.uid),
            where('to', '==', item.uid),
            where('status', '==', 'pending')
          )
        );

        if (!sentSnapshot.empty) {
          setConnectionRequest('sent');
          setRequestId(sentSnapshot.docs[0].id); // Guardar ID para cancelar
          setCheckingConnection(false);
          return;
        }

        // Verificar se há pedido pendente recebido
        const receivedSnapshot = await getDocs(
          query(
            collection(db, 'connectionRequests'),
            where('from', '==', item.uid),
            where('to', '==', user.uid),
            where('status', '==', 'pending')
          )
        );

        if (!receivedSnapshot.empty) {
          setConnectionRequest('received');
          setRequestId(receivedSnapshot.docs[0].id);
        }
      } catch (error) {
        console.error('Erro ao verificar status de conexão:', error);
      } finally {
        setCheckingConnection(false);
      }
    };

    checkConnectionStatus();
  }, [user, item.uid]);

  const handleSendMessage = async () => {
    setLoading(true);
    try {
      const channelId = await createChannel(item.uid, item.name || item.companyName);
      toast.success('A abrir conversa...');
      navigate(`/chat?channel=${channelId}`);
    } catch (error) {
      console.error('Erro ao criar canal:', error);
      toast.error('Erro ao criar conversa');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (onConnect) {
      await onConnect(item.uid);
      return;
    }

    // Sistema de pedido de conexão (aguarda aprovação)
    setLoading(true);
    try {
      const requestData = {
        from: user.uid,
        fromName: user.displayName || 'Utilizador',
        fromPhoto: user.photoURL || null,
        to: item.uid,
        toName: item.name || item.companyName || 'Utilizador',
        status: 'pending',
        timestamp: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'connectionRequests'), requestData);
      setConnectionRequest('sent');
      setRequestId(docRef.id); // Guardar ID para poder cancelar
      toast.success(`Pedido enviado para ${item.name || item.companyName}! Aguarda aprovação.`, {
        icon: '📤'
      });

      // Criar notificação para o destinatário
      try {
        await addDoc(collection(db, 'notifications', item.uid, 'items'), {
          type: 'connection_request',
          message: `${user.displayName} enviou-te um pedido de conexão`,
          read: false,
          timestamp: new Date(),
          link: `/profile/${user.uid}`,
          fromId: user.uid,
          fromName: user.displayName,
          fromPhoto: user.photoURL
        });
      } catch (e) {
        console.debug('Erro ao criar notificação:', e);
      }
    } catch (error) {
      console.error('Erro ao enviar pedido:', error);
      toast.error('Erro ao enviar pedido de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!requestId) return;

    setLoading(true);
    try {
      // 1. Remover o pedido
      await deleteDoc(doc(db, 'connectionRequests', requestId));
      
      // 2. Remover a notificação do destinatário
      try {
        const notificationsRef = collection(db, 'notifications', item.uid, 'items');
        const notifQuery = query(
          notificationsRef,
          where('type', '==', 'connection_request'),
          where('fromId', '==', user.uid)
        );
        
        const notifSnapshot = await getDocs(notifQuery);
        const deletePromises = notifSnapshot.docs.map(notifDoc => 
          deleteDoc(doc(db, 'notifications', item.uid, 'items', notifDoc.id))
        );
        
        await Promise.all(deletePromises);
      } catch (notifError) {
        console.debug('Erro ao remover notificação (não crítico):', notifError);
      }
      
      setConnectionRequest(null);
      setRequestId(null);
      toast.success('Pedido cancelado', { icon: '🔙' });
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
      toast.error('Erro ao cancelar pedido');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClick = () => {
    navigate(`/profile/${item.uid}`);
  };

  // Renderiza card de candidato (jovem)
  if (type === 'candidate') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          <img
            src={item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=6366f1&color=fff`}
            alt={item.name}
            onClick={handleProfileClick}
            className="w-16 h-16 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
            title={`Ver perfil de ${item.name}`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
              {item.matchScore >= 70 && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-700 text-xs rounded-full">
                  <Star className="w-3 h-3 fill-yellow-400 stroke-yellow-400" />
                  {item.matchScore}%
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 line-clamp-1">{item.bio || 'Profissional'}</p>
            
            {item.location && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3" />
                <span>{item.location}</span>
              </div>
            )}

            {(() => {
              const skillsArray = formatSkills(item.skills);
              return skillsArray.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {skillsArray.slice(0, 3).map((skill, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded">
                      {skill}
                    </span>
                  ))}
                  {skillsArray.length > 3 && (
                    <span className="px-2 py-0.5 text-gray-500 text-xs">
                      +{skillsArray.length - 3}
                    </span>
                  )}
                </div>
              );
            })()}

            {item.matchReasons && item.matchReasons.length > 0 && (
              <div className="mt-3 space-y-1">
                {item.matchReasons.slice(0, 2).map((reason, idx) => (
                  <p key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                    <span className="text-indigo-500 mt-0.5">•</span>
                    <span>{reason}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {checkingConnection ? (
            <button
              disabled
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-300 text-gray-600 rounded-lg text-sm font-medium"
            >
              Verificando...
            </button>
          ) : isConnected ? (
            <button
              onClick={handleSendMessage}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <MessageCircle className="w-4 h-4" />
              {loading ? 'A abrir...' : 'Enviar mensagem'}
            </button>
          ) : connectionRequest === 'sent' ? (
            <button
              onClick={handleCancelRequest}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-medium disabled:opacity-50"
              title="Clica para cancelar o pedido"
            >
              {loading ? 'Cancelando...' : '⏳ Pedido enviado (Cancelar)'}
            </button>
          ) : connectionRequest === 'received' ? (
            <button
              onClick={() => navigate(`/profile/${item.uid}`)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              ✓ Aceitar pedido
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? 'Enviando...' : 'Conectar'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Renderiza card de empresa
  if (type === 'company') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          <img
            src={item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=10b981&color=fff`}
            alt={item.name}
            onClick={handleProfileClick}
            className="w-16 h-16 rounded-lg object-cover cursor-pointer hover:ring-2 hover:ring-green-500 transition-all"
            title={`Ver perfil de ${item.name}`}
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">{item.bio || 'Empresa'}</p>
            
            {item.location && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3" />
                <span>{item.location}</span>
              </div>
            )}

            {item.matchReasons && item.matchReasons.length > 0 && (
              <div className="mt-3 space-y-1">
                {item.matchReasons.map((reason, idx) => (
                  <p key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                    <span className="text-green-500 mt-0.5">•</span>
                    <span>{reason}</span>
                  </p>
                ))}
              </div>
            )}

            {item.matchingJobs && item.matchingJobs.length > 0 && (
              <div className="mt-3 space-y-1">
                {item.matchingJobs.slice(0, 2).map((job, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(`/jobs?highlight=${job.jobId}`)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium block"
                  >
                    → {job.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSendMessage}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <MessageCircle className="w-4 h-4" />
            Enviar mensagem
          </button>
          <button
            onClick={() => navigate(`/profile/${item.uid}`)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Ver perfil
          </button>
        </div>
      </div>
    );
  }

  // Renderiza card de vaga
  if (type === 'job') {
    return (
      <>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
                {item.matchScore >= 70 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
                    <Star className="w-3 h-3 fill-green-400 stroke-green-400" />
                    {item.matchScore}%
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{item.companyName}</p>
              
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                {item.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{item.location}</span>
                  </div>
                )}
                {item.type && (
                  <span className="px-2 py-0.5 bg-gray-100 rounded">
                    {item.type === 'estagio' ? 'Estágio' : item.type === 'tempo integral' ? 'Tempo integral' : 'Remoto'}
                  </span>
                )}
              </div>

              {item.matchReasons && item.matchReasons.length > 0 && (
                <div className="mt-3 space-y-1">
                  {item.matchReasons.slice(0, 2).map((reason, idx) => (
                    <p key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                      <span className="text-indigo-500 mt-0.5">•</span>
                      <span>{reason}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setShowJobModal(true)}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              Ver vaga e candidatar
            </button>
          </div>
        </div>

        {/* Modal de Detalhes da Vaga */}
        <JobDetailsModal
          job={{
            id: item.jobId,
            title: item.title,
            description: item.description,
            companyName: item.companyName,
            companyId: item.companyId,
            companyLogo: item.companyAvatar,
            location: item.location,
            type: item.type,
            salary: item.salary,
            requirements: item.requirements,
            applicants: item.applicants || [],
            createdAt: item.createdAt,
            status: item.status
          }}
          isOpen={showJobModal}
          onClose={() => setShowJobModal(false)}
        />
      </>
    );
  }

  return null;
};

export default DiscoverCard;
