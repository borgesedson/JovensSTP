/**
 * aiService.js
 * 
 * Centralized service for AI operations.
 * Removed OpenAI as per user request.
 * Mentor Name: Sebê-Non
 */

const MENTOR_NAME = import.meta.env.VITE_MENTOR_NAME || "Sebê-Non";

const MENTOR_PERSONA = `És o "${MENTOR_NAME}" (Nosso Saber), o Mentor Digital Inteligente e Coletivo do JovemSTP. 
A tua voz é profissional, estratégica e sábia, mas acessível e motivadora.

TUAS ESPECIALIDADES (Foco Principal):
1. CONSULTOR DE NEGÓCIOS: És especialista em empreendedorismo local. Sabes como criar negócios em São Tomé e Príncipe com poucos recursos (Turismo, Agricultura Sustentável, Serviços Digitais). Dás dicas sobre planos de negócio, marketing de baixo custo e gestão financeira.
2. COACH DE CARREIRA: Ajudas jovens a entrar no mercado de trabalho. Dás feedback sobre Currículos (CV), dicas para entrevistas, e conselhos sobre postura profissional e soft skills.
3. GUIA DA APP (SUPORTE TÉCNICO): Conheces a plataforma JovemSTP melhor que ninguém.

O teu propósito é o SABER PARA AGIR e o SABER PARTILHAR:
- Incentiva sempre os utilizadores a usarem a aba "Explorar" na Academia. Diz-lhes que "o conhecimento é a chave da independência".
- Usa sempre o "nós" coletivo: "O nosso saber diz...", "Vamos construir o futuro...".

DADOS ATUAIS DA PLATAFORMA (Contexto Real):
{dynamicContext}`;

import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './firebase';

class AIService {
    static async getAppSnapshot() {
        try {
            if (!db) return "Contexto indisponível.";
            // Optimized fetch
            const jobsSnap = await getDocs(query(collection(db, 'jobs'), orderBy('createdAt', 'desc'), limit(2)));
            const coursesSnap = await getDocs(query(collection(db, 'courses'), limit(2)));

            const jobs = jobsSnap.docs.map(doc => `- ${doc.data().title}`).join('\n');
            const courses = coursesSnap.docs.map(doc => `- ${doc.data().title}`).join('\n');

            return `Vagas: ${jobs || 'N/A'}\nCursos: ${courses || 'N/A'}`;
        } catch (e) {
            return "Contexto simplificado.";
        }
    }

    static async callModel(prompt, systemPrompt = "", jsonMode = false) {
        // OpenAI was removed. Using simulation/mock logic.
        return this.simulateAIResponse(prompt);
    }

    static async summarize(text, title) {
        const systemPrompt = "Resume de forma curta e direta (máx 2 parágrafos) em português de STP.";
        return this.callModel(`Título: ${title}\nConteúdo: ${text}`, systemPrompt);
    }

    static async chat(userInput, currentContext = "Geral") {
        const snapshot = await this.getAppSnapshot();
        const systemPrompt = MENTOR_PERSONA.replace('{dynamicContext}', snapshot) + `\nContexto: ${currentContext}`;
        console.log("[AI Service] Chat context:", currentContext);
        return this.callModel(userInput, systemPrompt);
    }

    static async improveBio(currentBio, userContext = {}) {
        const systemPrompt = "Reescreve a bio para ser profissional e curta (máx 3 frases).";
        const prompt = `Bio: ${currentBio}\nSkills: ${userContext.skills || 'N/A'}`;
        return this.callModel(prompt, systemPrompt);
    }

    /**
     * Gera uma dica diária personalizada do mentor Sebê-Non.
     */
    static async getDailyMentorTip(user = null) {
        try {
            const userName = user?.displayName || user?.name || "Jovem";
            const prompt = `Olá ${userName}, dá-me a dica do dia.`;
            return await this.callModel(prompt, "Dica do Dia");
        } catch (error) {
            console.error("Erro ao buscar dica do mentor:", error);
            return "O segredo do progresso é começar. O nosso saber diz: foca-te no que podes controlar hoje!";
        }
    }

    static simulateAIResponse(prompt, error = null) {
        const name = import.meta.env.VITE_MENTOR_NAME || "Sebê-Non";
        if (error) return `⚠️ Erro: ${error.message}. Modo simulação ativo para ${name}.`;
        
        // Basic response mapping for simulation
        const p = prompt.toLowerCase();
        if (p.includes('olá') || p.includes('bom dia') || p.includes('boa tarde')) {
            return `Kumé Mé! Eu sou o ${name}. Como posso ajudar-te a transformar o teu saber em sucesso hoje?`;
        }
        if (p.includes('vaga') || p.includes('emprego') || p.includes('trabalho')) {
            return `O nosso saber diz que STP tem muitas oportunidades. Posso levar-te à lista de vagas se quiseres! 💼`;
        }
        if (p.includes('curso') || p.includes('estudar') || p.includes('academia')) {
            return `Aprender é crescer. Recomendo espreitares a nossa Academia para novos cursos e mentorias. 📚`;
        }
        
        return `O ${name} está a processar a tua ideia... O nosso saber coletivo motiva-nos a agir! (Modo Simulação local ativo)`;
    }
}

export default AIService;
