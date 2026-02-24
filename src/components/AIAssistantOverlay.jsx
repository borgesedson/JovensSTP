import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Compass, X, Send, Sparkles, User, Zap, MessageCircle, ArrowRight } from 'lucide-react';
import AIService from '../services/aiService';
import '../styles/mentor.css';

export default function AIAssistantOverlay() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'ai', content: 'Kumé Mé! Sou o "Sebê-Non", o teu Mentor Digital. Juntos, vamos transformar o nosso saber em sucesso. Como posso apoiar a tua jornada profissional hoje?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const chatEndRef = useRef(null);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Context detection based on route
    const getContext = () => {
        const path = location.pathname;
        if (path.includes('courses')) {
            // Se estiver num curso, tentar extrair info do ecrã se passar via props futuramente
            // Por agora, detetamos via URL ou estado global se disponível
            return 'Academia (Estudos)';
        }
        if (path.includes('jobs')) return 'Carreira (Empregos)';
        if (path.includes('communities')) return 'Social (Comunidades)';
        return 'Geral';
    };

    const handleSend = async (customPrompt = null) => {
        const query = customPrompt || input;
        if (!query.trim() || loading) return;

        const userMsg = { role: 'user', content: query };
        setMessages(prev => [...prev, userMsg]);
        if (!customPrompt) setInput('');
        setLoading(true);

        try {
            // Detect special requests for summaries
            let finalContext = getContext();
            if (query.toLowerCase().includes('resum') || query.toLowerCase().includes('explica')) {
                finalContext += " [MODO TUTOR ATIVADO: O utilizador quer um resumo ou explicação profunda]";
            }

            const aiResponse = await AIService.chat(query, finalContext);
            setMessages(prev => [...prev, { role: 'ai', content: aiResponse }]);

            // Intelligence Action Dispatcher
            const prompt = input.toLowerCase();
            if (prompt.includes('leva-me') || prompt.includes('ir para') || prompt.includes('quero ver')) {
                if (prompt.includes('emprego') || prompt.includes('vaga') || prompt.includes('trabalho')) {
                    setTimeout(() => navigate('/jobs'), 1500);
                } else if (prompt.includes('curso') || prompt.includes('estudar') || prompt.includes('aula')) {
                    setTimeout(() => navigate('/courses'), 1500);
                } else if (prompt.includes('comunidade') || prompt.includes('canal') || prompt.includes('gente')) {
                    setTimeout(() => navigate('/communities'), 1500);
                } else if (prompt.includes('perfil') || prompt.includes('minha conta')) {
                    setTimeout(() => navigate('/profile'), 1500);
                } else if (prompt.includes('mensagem') || prompt.includes('conversa') || prompt.includes('escrever a alguém')) {
                    setTimeout(() => navigate('/messages'), 1500);
                } else if (prompt.includes('definições') || prompt.includes('ajustes') || prompt.includes('configuração')) {
                    setTimeout(() => navigate('/settings'), 1500);
                } else if (prompt.includes('descobrir') || prompt.includes('explorar') || prompt.includes('novidades')) {
                    setTimeout(() => navigate('/discover'), 1500);
                }
            }

            // Intelligence: Command Execution (Opening Forms)
            if (prompt.includes('criar') || prompt.includes('publicar') || prompt.includes('postar') || prompt.includes('novo')) {
                if (prompt.includes('post') || prompt.includes('pensamento')) {
                    // Logic to open CreatePostForm would need global state or event bus
                    // For now, navigate to Home where the form is visible
                    navigate('/');
                    setMessages(prev => [...prev, { role: 'ai', content: 'Processando... Vamos ao feed principal. Partilha o teu saber com a nossa comunidade! ✍️' }]);
                } else if (prompt.includes('vaga') || prompt.includes('emprego')) {
                    navigate('/jobs');
                    setMessages(prev => [...prev, { role: 'ai', content: 'Com certeza. Vamos abrir o portal de oportunidades. STP precisa do teu talento! 💼' }]);
                }
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', content: 'Desculpa, tive um pequeno problema a processar a tua resposta. Tenta novamente!' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="aimentor-floating-container">
            {/* The Window */}
            {isOpen && (
                <div className="aimentor-window">
                    <div className="aimentor-header">
                        <div className="aimentor-avatar">
                            <Compass size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-black text-sm uppercase m-0 leading-none">Sebê-Non</h3>
                            <span className="text-[10px] opacity-80 font-bold uppercase tracking-wider">Nosso Saber Digital</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:rotate-90 transition-transform">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="aimentor-chat-area">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`mentor-msg ${msg.role}`}>
                                {msg.content}
                            </div>
                        ))}
                        {loading && (
                            <div className="mentor-msg ai italic opacity-50 flex items-center gap-2">
                                <Zap size={14} className="animate-pulse" /> A pensar...
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="p-3 bg-indigo-50/30">
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                            <div className="mentor-tip-badge" onClick={() => handleSend('Faz um resumo (Vem Bué) desta página')}>
                                <Sparkles size={12} /> Resumir Página
                            </div>
                            <div className="mentor-tip-badge" onClick={() => setInput('Leva-me a ver as vagas de emprego')}>
                                <ArrowRight size={12} /> Ver Vagas
                            </div>
                            <div className="mentor-tip-badge" onClick={() => setInput('Quero ir para a Academia estudar')}>
                                <ArrowRight size={12} /> Ir aos Cursos
                            </div>
                        </div>
                    </div>

                    <div className="aimentor-input-area">
                        <input
                            type="text"
                            className="aimentor-input"
                            placeholder="Pergunta ao mentor..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button
                            disabled={loading}
                            onClick={handleSend}
                            className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* The Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="aimentor-trigger"
            >
                {isOpen ? <X size={28} color="white" /> : <MessageCircle size={28} color="white" />}
                {!isOpen && <div className="aimentor-pulse"></div>}
            </button>
        </div>
    );
}
