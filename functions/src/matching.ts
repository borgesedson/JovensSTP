import * as admin from 'firebase-admin';

export interface UserProfile {
    uid: string;
    name?: string;
    displayName?: string;
    skills?: string[];
    location?: string;
    experienceLevel?: string;
    interests?: string[];
    type?: 'young' | 'company';
    photoURL?: string;
    avatar?: string;
}

export interface MatchResult {
    score: number;
    reasons: string[];
}

/**
 * Calcula score de match entre dois perfis
 */
export const calculateMatchScore = (profile1: UserProfile, profile2: UserProfile): MatchResult => {
    let score = 0;
    const reasons: string[] = [];

    // Skills em comum (peso: 40%)
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
 * Encontra candidatos próximos para um jovem no backend
 */
export const findNearbyCandidatesBackend = async (currentUserId: string, currentUserProfile: UserProfile, limitCount = 20) => {
    const usersRef = admin.firestore().collection('users');
    let snapshot = await usersRef.where('type', '==', 'young').limit(1000).get();

    // Fallback: se não houver usuários com type="young", tenta buscar sem o filtro (apenas limitando)
    if (snapshot.empty) {
        console.log('⚠️ No users with type="young" found, fetching first 100 users instead');
        snapshot = await usersRef.limit(100).get();
    }

    const allCandidates: any[] = [];

    snapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
        if (doc.id === currentUserId) return;
        const profile = doc.data() as UserProfile;

        // Se estivermos no fallback, garanta que não pegamos empresas se o tipo existir
        if (profile.type === 'company') return;

        const match = calculateMatchScore(currentUserProfile, profile);

        allCandidates.push({
            ...profile,
            uid: doc.id,
            type: 'candidate',
            name: profile.name || profile.displayName || 'Sem nome',
            avatar: profile.avatar || profile.photoURL || '',
            matchScore: match.score,
            matchReasons: match.reasons
        });
    });

    return allCandidates
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limitCount);
};
