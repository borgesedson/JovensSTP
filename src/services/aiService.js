/**
 * aiService.js
 * 
 * Centralized service for AI operations using OpenAI.
 * Migrated to OpenAI as per user request.
 * Mentor Name: Sebê-Non
 */

import OpenAI from "openai";

// Initialize OpenAI Client
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const MENTOR_NAME = import.meta.env.VITE_MENTOR_NAME || "Sebê-Non";

let openai;

if (API_KEY) {
    openai = new OpenAI({
        apiKey: API_KEY,
        dangerouslyAllowBrowser: true // Required for client-side use in Vite
    });
} else {
    console.warn("VITE_OPENAI_API_KEY is missing. AI features will be simulated.");
}

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
        if (!openai) return this.simulateAIResponse(prompt);

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini", // Cost-effective and powerful
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                response_format: jsonMode ? { type: "json_object" } : { type: "text" }
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error("[AI Service] OpenAI failed:", error);
            return this.simulateAIResponse(prompt, error);
        }
    }

    static async summarize(text, title) {
        const systemPrompt = "Resume de forma curta e direta (máx 2 parágrafos) em português de STP.";
        return this.callModel(`Título: ${title}\nConteúdo: ${text}`, systemPrompt);
    }

    static async chat(userInput, currentContext = "Geral") {
        const snapshot = await this.getAppSnapshot();
        const systemPrompt = MENTOR_PERSONA.replace('{dynamicContext}', snapshot) + `\nContexto: ${currentContext}`;
        return this.callModel(userInput, systemPrompt);
    }

    static async improveBio(currentBio, userContext = {}) {
        const systemPrompt = "Reescreve a bio para ser profissional e curta (máx 3 frases).";
        const prompt = `Bio: ${currentBio}\nSkills: ${userContext.skills || 'N/A'}`;
        return this.callModel(prompt, systemPrompt);
    }

    static simulateAIResponse(prompt, error = null) {
        const name = import.meta.env.VITE_MENTOR_NAME || "Sebê-Non";
        if (error) return `⚠️ Erro: ${error.message}. Modo simulação ativo para ${name}.`;
        return `O ${name} está a processar a tua ideia... (Modo Simulação)`;
    }
}

export default AIService;
