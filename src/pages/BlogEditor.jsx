import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Send, Mic, MicOff, Image as ImageIcon, Type, Sparkles, Bold, Italic, Underline, List, Heading } from 'lucide-react';
import { BlogRulesModal } from '../components/blog/BlogRulesModal';
import VPSService from '../services/VPSService';

export const BlogEditor = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [showRules, setShowRules] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('');
    const [coverImage, setCoverImage] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    const [showCustomCategory, setShowCustomCategory] = useState(false);
    const [customCategory, setCustomCategory] = useState('');
    
    // Voice Dictation States
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const editorRef = useRef(null); // Reference para o editor Word-like

    // Categorias sugeridas
    const SUGGESTED_CATEGORIES = ['Tecnologia', 'Negócios', 'Finanças', 'Educação', 'História STP', 'Dicas de Carreira', 'Desenvolvimento Pessoal', 'Literatura'];

    useEffect(() => {
        // Verifica se o utilizador já aceitou as regras antes
        const hasAccepted = localStorage.getItem('jovensstp_blog_rules_accepted');
        if (!hasAccepted) {
            setShowRules(true);
        }
    }, []);

    const handleAcceptRules = () => {
        localStorage.setItem('jovensstp_blog_rules_accepted', 'true');
        setShowRules(false);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Em produção pode requerer Firebase Storage. Aqui usamos Base64 direto.
            if (file.size > 500 * 1024) { // Limite da Firebase Database 1MB (500kb max per doc)
                toast.error("Imagem muito pesada (Limite 500KB). Tente recortar ou usar outra foto menor.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setCoverImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePublish = async () => {
        if (!user) {
            toast.error('Precisas de iniciar sessão para publicar!');
            return;
        }

        if (!title.trim() || !content.trim() || !category) {
            toast.error('Preenche o título, o conteúdo e seleciona uma categoria!');
            return;
        }

        setIsPublishing(true);
        const toastId = toast.loading('A publicar o teu artigo...');

        try {
            // Guarda na BD
            const docRef = await addDoc(collection(db, 'blog_posts'), {
                title,
                content,
                excerpt: content.replace(/<[^>]+>/g, '').substring(0, 150) + '...',
                category,
                coverImage,
                authorId: user.uid,
                authorName: user.displayName || 'Membro JovensSTP',
                authorAvatar: user.photoURL || '',
                status: 'published',
                createdAt: serverTimestamp(),
                claps: 0,
                readTime: Math.max(1, Math.ceil(content.split(' ').length / 200)) // Palavras por minuto
            });

            toast.success('Artigo publicado com sucesso!', { id: toastId });
            navigate(`/blog/${docRef.id}`);
            
            // Aqui seria a cloud function a enviar os PUSH NOTIFICATIONS
        } catch (error) {
            console.error("Erro ao publicar:", error);
            toast.error(`Erro: ${error.message || 'Falha ao publicar'}`, { id: toastId, duration: 5000 });
            setIsPublishing(false);
        }
    };

    const toggleRecording = async () => {
        if (isRecording) {
            // Parar a gravação
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            return;
        }

        // Iniciar gravação
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                audioChunksRef.current = []; // Reseta
                stream.getTracks().forEach(track => track.stop()); // Liberta o mic
                
                setIsTranscribing(true);
                const toastId = toast.loading('Magia da IA a trabalhar (A transcrever)...');
                
                try {
                    const result = await VPSService.transcribe(audioBlob);
                    if (result.text) {
                        setContent(prev => prev + (prev ? ' ' : '') + result.text);
                        // Atualiza visualmente o editor ContentEditable também
                        if (editorRef.current) {
                            editorRef.current.innerHTML += (editorRef.current.innerHTML ? ' ' : '') + result.text;
                        }
                        toast.success('Texto adicionado!', { id: toastId });
                    }
                } catch (error) {
                    console.error("VPS Transcription error:", error);
                    toast.error('Falha na transcrição. A VPS está a correr?', { id: toastId });
                } finally {
                    setIsTranscribing(false);
                }
            };

            audioChunksRef.current = [];
            mediaRecorderRef.current.start();
            setIsRecording(true);
            toast('Fale agora... A transcrever automaticamente para texto!', { icon: '🎙️' });
        } catch (error) {
            console.error("Erro no microfone:", error);
            toast.error('Precisas de permitir o acesso ao microfone!');
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <BlogRulesModal 
                isOpen={showRules} 
                onClose={() => navigate('/blog')} // Volta atrás se não aceitar
                onAccept={handleAcceptRules} 
            />

            {/* Header Mínimo / Actions */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 h-16 w-full max-w-5xl mx-auto mt-0 lg:mt-4 lg:rounded-t-3xl" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
                <button onClick={() => navigate('/blog')} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-gray-100 transition">
                    <ArrowLeft size={22} />
                </button>
                <div className="flex items-center gap-4">
                    <span className="text-xs font-medium text-gray-400 hidden sm:block">Rascunho a gravar automático...</span>
                    <button 
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2 rounded-full text-sm font-bold shadow-md transition disabled:opacity-50"
                    >
                        {isPublishing ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Send size={16} />}
                        {isPublishing ? 'A Publicar...' : 'Publicar'}
                    </button>
                </div>
            </div>

            {/* Editor Canvas Imersivo */}
            <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8 md:py-12 relative pb-40">
                
                {/* Capa */}
                <div className="relative group cursor-pointer transition-all duration-300 mb-10">
                    <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        title="Clica para escolher uma imagem da capa"
                    />
                    <div className={`w-full overflow-hidden relative rounded-2xl border-2 border-dashed ${coverImage ? 'border-transparent h-48 sm:h-64 shadow-md' : 'border-gray-200 bg-gray-50 h-32 hover:bg-green-50 hover:border-green-400'} flex items-center justify-center transition-all`}>
                        {coverImage ? (
                            <>
                                <img src={coverImage} alt="Capa" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                    <div className="text-white bg-black/50 px-4 py-2 rounded-full font-bold flex items-center gap-2">
                                        <ImageIcon size={18} /> Clica para Trocar Capa
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-gray-400 group-hover:text-green-600 transition">
                                <ImageIcon size={32} className="mx-auto mb-2 text-gray-300 group-hover:text-green-500 transition" />
                                <p className="font-bold text-sm">Clica para Carregar Capa Magnética</p>
                                <p className="text-xs text-gray-400 mt-1">Artigos com capas têm +70% de leituras!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bloco Categoria */}
                <div className="mb-10 pt-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Categoria do Artigo</span>
                    <div className="flex flex-wrap gap-2">
                        {SUGGESTED_CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => {
                                    setCategory(cat);
                                    setShowCustomCategory(false);
                                }}
                                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                                    category === cat && !showCustomCategory
                                    ? 'bg-green-600 text-white shadow-md scale-105' 
                                    : 'bg-white border border-gray-200 text-gray-600 hover:border-green-400 hover:bg-green-50'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                        <button
                            onClick={() => {
                                setShowCustomCategory(true);
                                setCategory('');
                            }}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                                showCustomCategory 
                                ? 'bg-green-600 text-white shadow-md scale-105' 
                                : 'bg-white border border-gray-200 text-gray-600 hover:border-green-400 hover:bg-green-50'
                            }`}
                        >
                            + Outra...
                        </button>
                    </div>

                    {showCustomCategory && (
                        <div className="mt-4 animate-in slide-in-from-top-2 duration-300">
                            <input 
                                type="text"
                                placeholder="Escreve o nome da nova categoria..."
                                value={customCategory}
                                onChange={(e) => {
                                    setCustomCategory(e.target.value);
                                    setCategory(e.target.value);
                                }}
                                className="w-full sm:max-w-xs bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition text-sm"
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                {/* Bloco Título */}
                <div className="mb-6">
                    <input 
                        type="text" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Introduz um Título Profissional..."
                        className="w-full text-4xl md:text-6xl font-black text-gray-900 placeholder:text-gray-300 bg-transparent border-none outline-none focus:ring-0 px-0 py-2 font-serif leading-tight"
                    />
                </div>

                {/* Barra de Ferramentas IA e Editor Flutuante */}
                <div className="flex flex-col gap-3 relative z-10 border-t border-gray-100 pt-6">
                    <div className="flex justify-between items-end border-b border-gray-100 pb-3 mb-2 sticky top-16 bg-white/95 backdrop-blur-sm z-30 pt-2">
                        
                        {/* Toolbar Clássica */}
                        <div className="flex flex-wrap items-center gap-1">
                            <button type="button" onClick={() => document.execCommand('bold', false, null)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition" title="Negrito"><Bold size={20} /></button>
                            <button type="button" onClick={() => document.execCommand('italic', false, null)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition" title="Itálico"><Italic size={20} /></button>
                            <button type="button" onClick={() => document.execCommand('underline', false, null)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition" title="Sublinhado"><Underline size={20} /></button>
                            <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>
                            <button type="button" onClick={() => document.execCommand('formatBlock', false, 'H2')} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition" title="Título Principal"><Heading size={20} /></button>
                            <button type="button" onClick={() => document.execCommand('insertUnorderedList', false, null)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition" title="Lista de Pontos"><List size={20} /></button>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Barra de Emojis Rápida */}
                            <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-full border border-gray-100">
                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider pr-2 border-r border-gray-200 mr-1">Magia</span>
                                {['🔥', '💡', '🚀', '⭐', '❤️', '🙌'].map(emoji => (
                                    <button 
                                        key={emoji}
                                        onClick={() => {
                                            setContent(prev => prev + emoji);
                                            if(editorRef.current) editorRef.current.innerHTML += emoji;
                                        }}
                                        className="hover:scale-125 transition-transform duration-200 hover:-translate-y-1 text-lg px-1"
                                        title={`Inserir o emoji ${emoji}`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>

                            <button 
                                onClick={toggleRecording}
                                disabled={isTranscribing}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition shadow-sm group ${
                                    isRecording 
                                    ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' 
                                    : 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200 hover:bg-green-100'
                                }`}
                                title="Fale e receba a transcrição do seu texto automaticamente"
                            >
                                {isRecording ? (
                                    <><MicOff size={14} /> A gravar... (Clica para Parar)</>
                                ) : (
                                    <><Mic size={14} className="group-hover:scale-110 transition" /> Clica e fale para receber a transcrição <Sparkles size={12} className="text-yellow-500 ml-0.5" /></>
                                )}
                            </button>
                        </div>
                    </div>

                        {/* Editor de Texto Avançado (Word-like Mínimo) */}
                        <div className="w-full relative group">
                            {/* Área ContentEditable Substack Style */}
                            <div 
                                ref={editorRef}
                                contentEditable={!isTranscribing}
                                onInput={(e) => setContent(e.currentTarget.innerHTML)}
                                className={`w-full min-h-[500px] py-4 outline-none prose md:prose-xl prose-green font-serif max-w-none text-gray-900 leading-relaxed ${isTranscribing ? 'opacity-50 text-gray-500 bg-gray-50 rounded-xl p-4' : ''}`}
                                data-placeholder={isTranscribing ? "A converter a tua voz em texto..." : "Partilha o teu conhecimento... Escreve aqui o teu artigo profissional"}
                                style={isTranscribing || !content ? { 
                                    '--tw-prose-body': '#111827', 
                                    opacity: isTranscribing ? 0.6 : 1 
                                } : {}}
                            />
                            
                            {!content && !isTranscribing && (
                                <div className="absolute top-4 left-0 text-xl md:text-2xl font-serif text-gray-400 pointer-events-none -z-10">
                                    Partilha o teu conhecimento... Escreve aqui o teu artigo profissional
                                </div>
                            )}
                        </div>
                    </div>
                </div>
        </div>
    );
};
