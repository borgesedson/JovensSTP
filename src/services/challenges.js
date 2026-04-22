import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs,
  getDoc,
  query, 
  where, 
  doc, 
  updateDoc, 
  increment, 
  serverTimestamp,
  limit,
  orderBy
} from 'firebase/firestore';

/**
 * Challenge Service - engagement engine
 */

const CHALLENGES_POOL = [
  {
    id: 'live_session',
    title: 'Missão Influenciador',
    description: '🔴 Toma a liderança! Inicia uma Live agora e partilha o teu conhecimento ou ideias com a rede.',
    xp: 100,
    type: 'action',
    actionUrl: '/chat' // Lives usually start from chat/video context
  },
  {
    id: 'record_meeting',
    title: 'Missão Mentor',
    description: '📹 Grava a tua próxima reunião e cria um legado de aprendizagem para quem não pôde estar presente.',
    xp: 80,
    type: 'action',
    actionUrl: '/chat'
  },
  {
    id: 'content_creator_meet',
    title: 'Missão Criador de Conteúdo',
    description: '🎬 Usa o Meet para gravar um conteúdo épico para a plataforma! Mostra o teu talento.',
    xp: 120,
    type: 'action',
    actionUrl: '/discover' // Or wherever the meet button is most accessible
  },
  {
    id: 'ambassador_invite',
    title: 'Missão Embaixador',
    description: '👑 Convida 3 novos amigos para a JovensSTP e ajuda a nossa rede a crescer. És a nossa voz!',
    xp: 150,
    type: 'action',
    actionUrl: '/profile'
  },
  {
    id: 'platform_share',
    title: 'Voz de STP',
    description: '📢 Partilha a plataforma nas tuas redes sociais e mostra ao mundo o poder da juventude de STP!',
    xp: 60,
    type: 'action',
    actionUrl: '/'
  },
  {
    id: 'chat_networking',
    title: 'Missão Conexão',
    description: '🤝 Networking é poder! Envia uma mensagem inspiradora no chat Geral e conhece alguém novo.',
    xp: 40,
    type: 'action',
    actionUrl: '/chat'
  },
  {
    id: 'english_daily',
    title: 'English Mastery',
    description: '🚀 Keep your streak! Learn 5 new professional words in the English Hub today.',
    xp: 40,
    type: 'action',
    actionUrl: '/academy'
  },
  {
    id: 'stp_culture',
    title: 'Orgulho STP',
    description: '🌴 Partilha uma curiosidade, foto ou história sobre a nossa cultura no feed agora.',
    xp: 50,
    type: 'action',
    actionUrl: '/'
  }
];

export const getActiveChallenge = async (userId) => {
  if (!userId) return null;
  
  try {
    // 1. Obter o desafio global ativo diretamente por ID de documento
    const systemDoc = await getDoc(doc(db, 'settings', 'current_challenge'));
    let currentGlobalId = null;
    
    if (systemDoc.exists()) {
      currentGlobalId = systemDoc.data().challengeId;
    }

    // 2. Tentar encontrar o desafio do utilizador (se já o iniciou)
    const now = new Date();
    const startOfOneHour = new Date(now.getTime() - (1 * 60 * 60 * 1000));
    
    const userQ = query(
      collection(db, 'user_challenges'),
      where('userId', '==', userId),
      where('createdAt', '>=', startOfOneHour),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    
    const userSnap = await getDocs(userQ);
    if (!userSnap.empty) {
      return { id: userSnap.docs[0].id, ...userSnap.docs[0].data() };
    }
    
    // 3. Se não iniciou, criar um novo baseado no global (ou aleatório)
    const baseChallenge = CHALLENGES_POOL.find(c => c.id === currentGlobalId) || 
                          CHALLENGES_POOL[Math.floor(Math.random() * CHALLENGES_POOL.length)];

    const newChallenge = {
      ...baseChallenge,
      userId,
      status: 'active',
      createdAt: serverTimestamp(),
      completedAt: null
    };
    
    const docRef = await addDoc(collection(db, 'user_challenges'), newChallenge);
    return { id: docRef.id, ...newChallenge };
  } catch (error) {
    console.error('Error getting active challenge:', error);
    return CHALLENGES_POOL[0];
  }
};

export const completeChallenge = async (userChallengeId, userId, xpAmount) => {
  try {
    // 1. Mark challenge as completed
    await updateDoc(doc(db, 'user_challenges', userChallengeId), {
      status: 'completed',
      completedAt: serverTimestamp()
    });
    
    // 2. Award XP to user
    await updateDoc(doc(db, 'users', userId), {
      xp: increment(xpAmount),
      challengesCompleted: increment(1)
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error completing challenge:', error);
    return { success: false };
  }
};
