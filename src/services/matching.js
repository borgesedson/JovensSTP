import { collection, query, where, getDocs, limit, orderBy, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Calcula score de match entre dois perfis baseado em:
 * - Skills em comum
 * - Proximidade geográfica
 * - Nível de experiência compatível
 * - Interesses em comum
 */
export const calculateMatchScore = (profile1, profile2) => {
  let score = 0;
  const reasons = [];

  // Skills em comum (peso: 40%)
  // Garante que skills é sempre um array
  const skills1 = Array.isArray(profile1.skills) ? profile1.skills : [];
  const skills2 = Array.isArray(profile2.skills) ? profile2.skills : [];
  
  const commonSkills = skills1.filter(skill => 
    skills2.some(s => s.toLowerCase() === skill.toLowerCase())
  );
  
  if (commonSkills.length > 0) {
    score += (commonSkills.length / Math.max(skills1.length, skills2.length)) * 40;
    reasons.push(`${commonSkills.length} skill${commonSkills.length > 1 ? 's' : ''} em comum: ${commonSkills.slice(0, 3).join(', ')}`);
  }

  // Localização (peso: 25%)
  if (profile1.location && profile2.location) {
    const loc1 = profile1.location.toLowerCase();
    const loc2 = profile2.location.toLowerCase();
    
    if (loc1 === loc2) {
      score += 25;
      reasons.push(`Ambos em ${profile1.location}`);
    } else if (loc1.includes(loc2) || loc2.includes(loc1)) {
      score += 15;
      reasons.push(`Localizações próximas`);
    }
  }

  // Experiência compatível (peso: 20%)
  const exp1 = profile1.experienceLevel || 'junior';
  const exp2 = profile2.experienceLevel || 'junior';
  const expLevels = ['estagiario', 'junior', 'pleno', 'senior'];
  const diff = Math.abs(expLevels.indexOf(exp1) - expLevels.indexOf(exp2));
  
  if (diff <= 1) {
    score += 20 - (diff * 5);
    reasons.push(`Nível de experiência compatível`);
  }

  // Interesses em comum (peso: 15%)
  // Garante que interests é sempre um array
  const interests1 = Array.isArray(profile1.interests) ? profile1.interests : [];
  const interests2 = Array.isArray(profile2.interests) ? profile2.interests : [];
  
  const commonInterests = interests1.filter(interest => 
    interests2.some(i => i.toLowerCase() === interest.toLowerCase())
  );
  
  if (commonInterests.length > 0) {
    score += (commonInterests.length / Math.max(interests1.length, interests2.length)) * 15;
    reasons.push(`Interesses em comum: ${commonInterests.slice(0, 2).join(', ')}`);
  }

  return { score: Math.min(100, Math.round(score)), reasons };
};

/**
 * Encontra candidatos próximos para um jovem
 * Retorna outros jovens com skills/interesses similares
 */
export const findNearbyCandidates = async (currentUserId, currentUserProfile, limitCount = 100) => {
  try {
    const usersRef = collection(db, 'users');
    
    // Primeiro tenta buscar com filtro de tipo
    let q = query(
      usersRef,
      where('type', '==', 'young')
    );

    let snapshot = await getDocs(q);
    console.log('📊 Jovens com type="young":', snapshot.size);
    
    // Se não encontrar nada, busca TODOS os usuários (pode ser que o campo type não exista)
    if (snapshot.size === 0) {
      console.log('⚠️ Nenhum usuário com type="young", buscando TODOS os usuários...');
      q = query(usersRef, limit(50));
      snapshot = await getDocs(q);
      console.log('📊 Total de usuários no Firebase:', snapshot.size);
    }
    
    const candidates = [];
    const allCandidates = [];

    snapshot.forEach(doc => {
      const profile = doc.data();
      console.log('👤 Processando usuário:', {
        id: doc.id,
        nome: profile.name || profile.displayName,
        type: profile.type,
        email: profile.email,
        ehUsuarioAtual: doc.id === currentUserId,
        ehEmpresa: profile.type === 'company'
      });
      if (doc.id === currentUserId) {
        console.log('⏩ PULANDO: É o próprio usuário');
        return;
      }
      if (profile.type === 'company') {
        console.log('⏩ PULANDO: É uma empresa');
        return;
      }
      // Permitir perfis incompletos: garantir campos mínimos
      const safeProfile = {
        ...profile,
        name: profile.name || profile.displayName || 'Sem nome',
        avatar: profile.avatar || profile.photoURL || '',
        uid: doc.id
      };
      let match = { score: 0, reasons: [] };
      try {
        match = calculateMatchScore(currentUserProfile, profile);
      } catch (e) {
        console.warn('Erro ao calcular match para', doc.id, e);
      }
      const candidate = {
        ...safeProfile,
        matchScore: match.score,
        matchReasons: match.reasons
      };
      allCandidates.push(candidate);
      console.log('➕ Adicionado a allCandidates (total:', allCandidates.length + ')');
      if (match.score >= 20) {
        candidates.push(candidate);
        console.log('⭐ Score >= 20, adicionado a candidates (total:', candidates.length + ')');
      } else {
        console.log('⚠️ Score < 20, apenas em allCandidates');
      }
    });

    console.log('📈 Candidatos com score ≥20:', candidates.length);
    console.log('📊 Total de candidatos processados:', allCandidates.length);
    
    // IMPORTANTE: Se allCandidates está vazio mas tínhamos documentos, há um problema
    if (allCandidates.length === 0 && snapshot.size > 0) {
      console.error('🚨 PROBLEMA: Tínhamos', snapshot.size, 'documentos mas allCandidates está vazio!');
      console.error('🚨 Possíveis causas: Todos eram empresas ou o próprio usuário');
    }
    
    // Sempre retorna todos os candidatos encontrados, ordenados por score e limitado por limitCount
    const sortedCandidates = allCandidates.sort((a, b) => b.matchScore - a.matchScore);
    console.log('🎯 Retornando:', Math.min(sortedCandidates.length, limitCount), 'candidatos');
    return sortedCandidates.slice(0, limitCount);
  } catch (error) {
    console.error('❌ Erro ao buscar candidatos próximos:', error);
    return [];
  }
};

/**
 * Encontra empresas que estão procurando pelo perfil do jovem
 * Baseado em vagas publicadas que match com as skills do jovem
 * OTIMIZADO: Batch queries para empresas
 */
export const findInterestedCompanies = async (currentUserProfile, limitCount = 10) => {
  try {
    const jobsRef = collection(db, 'jobs');
    
    // Busca mais vagas para melhor cobertura
    let q = query(
      jobsRef,
      orderBy('createdAt', 'desc'),
      limit(100) // Aumentado de 50 para 100
    );

    let snapshot;
    try {
      snapshot = await getDocs(q);
    } catch (err) {
      console.log('⚠️ Erro ao ordenar por createdAt, buscando sem ordem:', err.message);
      q = query(jobsRef, limit(100));
      snapshot = await getDocs(q);
    }
    
    console.log('💼 Total de vagas no Firebase:', snapshot.size);
    
    const companiesMap = new Map();
    const companyIds = new Set(); // Para batch query

    // Primeiro pass: identifica empresas com match
    for (const jobDoc of snapshot.docs) {
      const job = jobDoc.data();
      
      if (job.status === 'archived' || job.status === 'paused') {
        continue;
      }
      
      const requiredSkills = job.requirements || [];
      const userSkills = currentUserProfile.skills || [];

      const matchingSkills = userSkills.filter(skill =>
        requiredSkills.some(req => req.toLowerCase().includes(skill.toLowerCase()))
      );

      if (matchingSkills.length > 0) {
        companyIds.add(job.companyId);
        
        if (!companiesMap.has(job.companyId)) {
          companiesMap.set(job.companyId, {
            uid: job.companyId,
            matchingJobs: [],
            totalMatches: 0
          });
        }

        const company = companiesMap.get(job.companyId);
        company.matchingJobs.push({
          jobId: jobDoc.id,
          title: job.title,
          matchingSkills
        });
        company.totalMatches += matchingSkills.length;
      }
    }

    console.log('🏢 Empresas com match encontradas:', companyIds.size);

    // OTIMIZAÇÃO: Batch query para empresas (10 por vez)
    if (companyIds.size > 0) {
      const companyIdsArray = Array.from(companyIds);
      const batchSize = 10; // Firestore 'in' limit
      
      for (let i = 0; i < companyIdsArray.length; i += batchSize) {
        const batch = companyIdsArray.slice(i, i + batchSize);
        const usersRef = collection(db, 'users');
        const batchQuery = query(usersRef, where('__name__', 'in', batch));
        const batchSnapshot = await getDocs(batchQuery);
        
        batchSnapshot.forEach(doc => {
          const companyData = doc.data();
          const company = companiesMap.get(doc.id);
          
          if (company) {
            Object.assign(company, {
              ...companyData,
              name: companyData.name || companyData.displayName || 'Empresa',
              avatar: companyData.avatar || companyData.photoURL
            });
          }
        });
      }
    }
    
    // Se não encontrou empresas, busca diretas
    if (companiesMap.size === 0) {
      console.log('⚠️ Nenhuma empresa com vagas compatíveis, buscando todas as empresas...');
      const usersRef = collection(db, 'users');
      const companiesQuery = query(usersRef, where('type', '==', 'company'), limit(limitCount));
      const companiesSnapshot = await getDocs(companiesQuery);
      
      const directCompanies = [];
      companiesSnapshot.forEach(doc => {
        const companyData = doc.data();
        directCompanies.push({
          ...companyData,
          name: companyData.name || companyData.displayName || 'Empresa',
          avatar: companyData.avatar || companyData.photoURL,
          uid: doc.id,
          matchScore: 0,
          matchReasons: ['Empresa disponível']
        });
      });
      
      return directCompanies;
    }
    
    // Ordena e retorna top results
    const results = Array.from(companiesMap.values())
      .filter(c => c.name) // Só retorna empresas que foram carregadas
      .sort((a, b) => b.totalMatches - a.totalMatches)
      .slice(0, limitCount)
      .map(company => ({
        ...company,
        matchScore: Math.min(100, Math.round((company.totalMatches / 5) * 100)), // Score baseado em matches
        matchReasons: [
          `${company.matchingJobs.length} vaga${company.matchingJobs.length > 1 ? 's' : ''} compatível${company.matchingJobs.length > 1 ? 'is' : ''} com o teu perfil`,
          `Skills procuradas: ${[...new Set(company.matchingJobs.flatMap(j => j.matchingSkills))].slice(0, 3).join(', ')}`
        ]
      }));
    
    console.log('🎯 Retornando:', results.length, 'empresas');
    return results;
  } catch (error) {
    console.error('❌ Erro ao buscar empresas interessadas:', error);
    return [];
  }
};

/**
 * Encontra vagas recomendadas para o perfil do jovem
 * OTIMIZADO: Batch queries para empresas + limit dinâmico
 */
export const findRecommendedJobs = async (currentUserProfile, limitCount = 10) => {
  try {
    const jobsRef = collection(db, 'jobs');
    
    // Busca mais vagas inicialmente para garantir bons matches
    const q = query(
      jobsRef,
      orderBy('createdAt', 'desc'),
      limit(150) // Aumentado de 50 para 150
    );

    const snapshot = await getDocs(q);
    const jobs = [];
    const allJobs = [];
    const companyIds = new Set();
    const jobsData = [];

    // Primeira pass: calcula scores e coleta company IDs
    for (const jobDoc of snapshot.docs) {
      const job = jobDoc.data();
      
      if (job.status === 'archived' || job.status === 'paused') continue;
      
      const requiredSkills = job.requirements || [];
      const userSkills = currentUserProfile.skills || [];

      let score = 0;
      const reasons = [];

      // Skills match (60%)
      const matchingSkills = userSkills.filter(skill =>
        requiredSkills.some(req => req.toLowerCase().includes(skill.toLowerCase()))
      );

      if (matchingSkills.length > 0) {
        score += (matchingSkills.length / Math.max(requiredSkills.length, 1)) * 60;
        reasons.push(`${matchingSkills.length} skill${matchingSkills.length > 1 ? 's' : ''} compatível${matchingSkills.length > 1 ? 'is' : ''}`);
      }

      // Localização (25%)
      if (job.location && currentUserProfile.location) {
        const jobLoc = job.location.toLowerCase();
        const userLoc = currentUserProfile.location.toLowerCase();
        
        if (jobLoc === userLoc || job.type === 'remoto') {
          score += 25;
          reasons.push(job.type === 'remoto' ? 'Trabalho remoto' : 'Localização próxima');
        }
      }

      // Nível de experiência (15%)
      if (job.experienceLevel === currentUserProfile.experienceLevel) {
        score += 15;
        reasons.push('Nível de experiência ideal');
      }

      companyIds.add(job.companyId);
      jobsData.push({
        ...job,
        jobId: jobDoc.id,
        score: Math.round(score),
        reasons
      });
    }

    // OTIMIZAÇÃO: Batch query para empresas
    const companiesData = new Map();
    const companyIdsArray = Array.from(companyIds);
    const batchSize = 10;
    
    for (let i = 0; i < companyIdsArray.length; i += batchSize) {
      const batch = companyIdsArray.slice(i, i + batchSize);
      const usersRef = collection(db, 'users');
      const batchQuery = query(usersRef, where('__name__', 'in', batch));
      const batchSnapshot = await getDocs(batchQuery);
      
      batchSnapshot.forEach(doc => {
        const companyData = doc.data();
        companiesData.set(doc.id, {
          name: companyData.name || companyData.displayName || 'Empresa',
          avatar: companyData.avatar || companyData.photoURL || ''
        });
      });
    }

    // Monta resultado final com dados das empresas
    for (const jobData of jobsData) {
      const company = companiesData.get(jobData.companyId) || { name: 'Empresa', avatar: '' };
      
      const jobItem = {
        ...jobData,
        companyName: company.name,
        companyAvatar: company.avatar,
        matchScore: jobData.score,
        matchReasons: jobData.reasons.length > 0 ? jobData.reasons : ['Vaga disponível']
      };
      
      allJobs.push(jobItem);
      
      if (jobData.score >= 15) { // Score mínimo mais permissivo
        jobs.push(jobItem);
      }
    }

    // Retorna matches ou todas se não houver suficientes
    let results = jobs.length >= limitCount ? jobs : allJobs;
    
    return results
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limitCount);
  } catch (error) {
    console.error('Erro ao buscar vagas recomendadas:', error);
    return [];
  }
};

/**
 * Busca talentos para empresas com filtros
 */
export const searchTalents = async (filters = {}, limitCount = 20) => {
      // Função utilitária para normalizar strings (remove acentos, caracteres especiais, caixa baixa)
      function normalize(str) {
        return (str || '')
          .toLowerCase()
          .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[^a-z0-9 ]/g, '') // Remove caracteres especiais
          .trim();
      }
  try {
    const usersRef = collection(db, 'users');
    let q = query(
      usersRef,
      where('type', '==', 'young'),
      limit(100)
    );

    // Aplica filtro de experiência se fornecido
    if (filters.experienceLevel && filters.experienceLevel !== 'todos') {
      q = query(
        usersRef,
        where('type', '==', 'young'),
        where('experienceLevel', '==', filters.experienceLevel),
        limit(100)
      );
    }

    const snapshot = await getDocs(q);
    let talents = [];

    snapshot.forEach(doc => {
      const profile = doc.data();
      let matches = true;

      // Filtro de skills (melhorado: normaliza e aceita variações)
      if (filters.skills && filters.skills.length > 0) {
        const skillsArr = Array.isArray(profile.skills) ? profile.skills : [];
        const userSkills = skillsArr.map(normalize);
        const filterSkills = filters.skills.map(normalize);
        // Log para depuração
        console.log('Perfil:', profile.name || profile.displayName, '| Skills:', profile.skills, '| Normalizadas:', userSkills, '| Filtro:', filterSkills);
        matches = filterSkills.some(normSkill => {
          return userSkills.some(us => us.includes(normSkill) || normSkill.includes(us));
        });
        if (matches) {
          console.log('MATCH: ', profile.name || profile.displayName);
        }
      }

      // Filtro de localização
      if (matches && filters.location && filters.location !== 'todos') {
        if (filters.location === 'remoto') {
          matches = profile.openToRemote === true;
        } else {
          matches = profile.location && profile.location.toLowerCase().includes(filters.location.toLowerCase());
        }
      }

      if (matches) {
        const reasons = [];
        
        if (filters.skills && filters.skills.length > 0) {
          const matchingSkills = (profile.skills || []).filter(skill => {
            const normSkill = normalize(skill);
            return filters.skills.some(fs => {
              const normFs = normalize(fs);
              return normSkill.includes(normFs) || normFs.includes(normSkill);
            });
          });
          if (matchingSkills.length > 0) {
            reasons.push(`Skills: ${matchingSkills.slice(0, 3).join(', ')}`);
          }
        }

        if (profile.experienceLevel) {
          reasons.push(`Nível: ${profile.experienceLevel}`);
        }

        if (profile.location) {
          reasons.push(`Localização: ${profile.location}`);
        }

        talents.push({
          ...profile,
          name: profile.name || profile.displayName || 'Sem nome', // Garante que name existe
          avatar: profile.avatar || profile.photoURL, // Garante que avatar existe
          uid: doc.id,
          matchReasons: reasons
        });
      }
    });

    return talents.slice(0, limitCount);
  } catch (error) {
    console.error('Erro ao buscar talentos:', error);
    return [];
  }
};

/**
 * Salva uma busca de talentos para a empresa
 */
export const saveTalentSearch = async (companyId, searchName, filters) => {
  try {
    const userRef = doc(db, 'users', companyId);
    await updateDoc(userRef, {
      savedSearches: arrayUnion({
        id: Date.now().toString(),
        name: searchName,
        filters,
        createdAt: new Date().toISOString()
      })
    });
    return true;
  } catch (error) {
    console.error('Erro ao salvar busca:', error);
    return false;
  }
};

/**
 * Gera sugestões diárias para o feed (cache por 24h)
 */
export const getDailySuggestions = async (userId, userProfile, userType) => {
  const cacheKey = `suggestions_${userId}_${new Date().toDateString()}`;
  
  // Verifica cache no localStorage
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  let suggestions = [];

  if (userType === 'young') {
    // Para jovens: 2 candidatos + 2 empresas + 3 vagas
    const [candidates, companies, jobs] = await Promise.all([
      findNearbyCandidates(userId, userProfile, 2),
      findInterestedCompanies(userProfile, 2),
      findRecommendedJobs(userProfile, 3)
    ]);

    suggestions = [
      ...candidates.map(c => ({ ...c, type: 'candidate' })),
      ...companies.map(c => ({ ...c, type: 'company' })),
      ...jobs.map(j => ({ ...j, type: 'job' }))
    ];
  } else {
    // Para empresas: 5 talentos recomendados
    const talents = await searchTalents({}, 5);
    suggestions = talents.map(t => ({ ...t, type: 'talent' }));
  }

  // Salva no cache
  localStorage.setItem(cacheKey, JSON.stringify(suggestions));

  return suggestions;
};
