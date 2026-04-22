import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Heart, MessageSquare, Share2, Bookmark, Clock, User, Sparkles, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { CommentsSection } from '../components/CommentsSection';
import VPSService from '../services/VPSService';

export const BlogPostDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isLiking, setIsLiking] = useState(false);
    
    // VPS Translate States
    const [targetLanguage, setTargetLanguage] = useState('pt');
    const [isTranslating, setIsTranslating] = useState(false);
    const [translatedTitle, setTranslatedTitle] = useState('');
    const [translatedContent, setTranslatedContent] = useState('');
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [showComments, setShowComments] = useState(false);
    
    // Idiomas suportados
    const languages = [
        { code: 'pt', name: 'Português (Original)' },
        { code: 'en', name: 'Inglês' },
        { code: 'es', name: 'Espanhol' },
        { code: 'fr', name: 'Francês' },
        { code: 'it', name: 'Italiano' },
        { code: 'de', name: 'Alemão' },
        { code: 'nl', name: 'Holandês' },
        { code: 'ru', name: 'Russo' },
        { code: 'zh', name: 'Mandarim' },
        { code: 'ja', name: 'Japonês' },
        { code: 'ko', name: 'Coreano' },
        { code: 'ar', name: 'Árabe' },
        { code: 'hi', name: 'Hindi' },
        { code: 'tr', name: 'Turco' },
        { code: 'pl', name: 'Polonês' },
        { code: 'sv', name: 'Sueco' },
        { code: 'el', name: 'Grego' }
    ];

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'blog_posts', id), (docObj) => {
            if (docObj.exists()) {
                setPost({ id: docObj.id, ...docObj.data() });
            } else {
                setPost(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [id]);

    const handleClap = async () => {
        if (!user) {
            toast.error('Precisas de iniciar sessão para aplaudir este artigo!');
            return;
        }
        if (isLiking) return;

        setIsLiking(true);
        try {
            await updateDoc(doc(db, 'blog_posts', id), {
                claps: increment(1)
            });
            // Opcional: Feedback háptico ou animação 
        } catch (error) {
            console.error("Erro ao aplaudir:", error);
        } finally {
            setIsLiking(false);
        }
    };

    const handleShare = () => {
        const shareData = {
            title: post?.title,
            text: post?.excerpt,
            url: window.location.href
        };
        if (navigator.share) {
            navigator.share(shareData).catch(console.error);
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Link copiado para a área de transferência!');
        }
    };

    const handleBookmark = () => {
        setIsBookmarked(!isBookmarked);
        if (!isBookmarked) {
            toast.success('Artigo guardado nos teus favoritos!');
        } else {
            toast.success('Artigo removido dos favoritos.');
        }
    };

    const handleTranslate = async (langCode) => {
        setTargetLanguage(langCode);
        
        // Voltar ao idioma original
        if (langCode === 'pt') {
            setTranslatedTitle('');
            setTranslatedContent('');
            return;
        }
        
        setIsTranslating(true);
        const toastId = toast.loading('VPS AI a traduzir artigo...', { icon: '🧠' });
        
        try {
            // Traduzir o Título e o Conteúdo de forma síncrona
            // Em produção alta pode ser feito via Promise.all para ser mais rápido
            const [titleRes, contentRes] = await Promise.all([
                VPSService.translate(post.title, langCode, 'pt'),
                VPSService.translate(post.content, langCode, 'pt')
            ]);
            
            setTranslatedTitle(titleRes.translatedText);
            setTranslatedContent(contentRes.translatedText);
            
            toast.success(`Traduzido para ${languages.find(l => l.code === langCode).name}`, { id: toastId });
        } catch (error) {
            console.error("VPS Translation error:", error);
            toast.error('Erro na tradução. A VPS está online?', { id: toastId });
            setTargetLanguage('pt');
        } finally {
            setIsTranslating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mb-4"></div>
                <p className="text-gray-500">A abrir o artigo...</p>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <AlertCircle size={48} className="text-gray-400 mb-4" />
                <h1 className="text-xl font-bold text-gray-800">Artigo não encontrado</h1>
                <button onClick={() => navigate('/blog')} className="mt-4 text-green-600 font-bold underline">Voltar ao Blog</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white pb-24">
            
            {/* Header / Navbar */}
            <div className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-50 flex items-center justify-between px-4 h-16" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
                <button onClick={() => navigate('/blog')} className="p-2 -ml-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100 transition">
                    <ArrowLeft size={22} />
                </button>
                
                {/* Tradutor VPS */}
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full pl-3 pr-1 py-1">
                    <Sparkles size={14} className="text-yellow-500" />
                    <select 
                        className="bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer"
                        value={targetLanguage}
                        onChange={(e) => handleTranslate(e.target.value)}
                        disabled={isTranslating}
                    >
                        {languages.map(lang => (
                            <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Content Container (Medium/Substack Style Clean Layout) */}
            <div className="max-w-screen-xl mx-auto md:mt-24 mt-16 px-4 sm:px-6 md:px-8 bg-white flex flex-col items-center">
                
                {/* Header Info Above Image */}
                <div className="w-full max-w-2xl pt-8 md:pt-12 pb-6 flex flex-col items-start">
                    <span className="text-[13px] font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full uppercase tracking-wider mb-5">
                        {post.category}
                    </span>
                    
                    <h1 className="text-[32px] md:text-[42px] font-extrabold text-[#242424] leading-[1.2] mb-6 font-serif">
                        {translatedTitle || post.title}
                    </h1>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full border-y border-gray-100 py-4 mb-6">
                        <div className="flex items-center gap-3">
                            {post.authorAvatar ? (
                                <img src={post.authorAvatar} alt={post.authorName} className="w-11 h-11 rounded-full object-cover shadow-sm" />
                            ) : (
                                <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg">
                                    {post.authorName?.charAt(0) || 'U'}
                                </div>
                            )}
                            <div className="text-left">
                                <p className="font-semibold text-[#242424] text-[15px]">{post.authorName}</p>
                                <div className="flex items-center text-[14px] text-gray-500 mt-0.5">
                                    <span>{post.readTime || '3'} min leitura</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-4 sm:mt-0 text-gray-500">
                            <button onClick={handleShare} className="hover:text-[#242424] transition" title="Partilhar"><Share2 size={20} className="stroke-[1.5]" /></button>
                            {user && (
                                <button onClick={handleBookmark} className={`transition ${isBookmarked ? 'text-gray-900' : 'hover:text-[#242424]'}`} title="Guardar">
                                    <Bookmark size={20} className={`stroke-[1.5] ${isBookmarked ? "fill-current" : ""}`} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Imagem de Capa Larga */}
                {post.coverImage && (
                    <div className="w-full max-w-4xl mb-12">
                        <img src={post.coverImage} alt={post.title} className="w-full h-auto max-h-[600px] object-cover" />
                    </div>
                )}

                {/* Article Body */}
                <div className="w-full flex justify-center py-2">
                    <div 
                        className={`prose prose-lg md:prose-xl prose-a:text-green-600 prose-headings:font-sans prose-headings:font-bold prose-p:leading-[1.8] prose-p:text-[#242424] prose-li:text-[#242424] text-[#242424] font-serif transition-opacity duration-300 w-full max-w-2xl ${isTranslating ? 'opacity-30 blur-sm' : 'opacity-100'}`} 
                        dangerouslySetInnerHTML={{ __html: translatedContent || post.content }}
                    />
                </div>

                <hr className="my-12 border-gray-100" />

                {/* Footer Actions / Claps */}
                <div className="flex flex-row items-center justify-between mb-16 gap-3 sm:gap-6 border-y border-gray-100 py-6 w-full max-w-2xl px-2">
                    <button 
                        onClick={handleClap}
                        className="flex items-center gap-2 bg-gray-50 hover:bg-green-50 text-gray-700 hover:text-green-600 px-4 sm:px-6 py-3 rounded-full font-bold transition group shadow-sm border border-gray-100"
                    >
                        <div className="relative text-2xl">
                            <span className="group-hover:scale-125 transition inline-block">👏</span>
                            {isLiking && <span className="absolute -top-6 left-0 text-xl animate-ping">👏</span>}
                        </div>
                        <span className="text-lg">({post.claps || 0})</span>
                    </button>
                    
                    <button 
                        onClick={() => setShowComments(true)}
                        className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-5 sm:px-8 rounded-full shadow-md transition whitespace-nowrap"
                    >
                        <MessageSquare size={20} /> Comentar
                    </button>
                </div>

                {/* CTA para Anónimos */}
                {!user && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-3xl p-8 text-center border border-green-100 shadow-sm mb-16 max-w-2xl mx-auto">
                        <h4 className="text-xl font-bold text-gray-900 mb-3">Gostaste desta leitura?</h4>
                        <p className="text-gray-600 mb-6">Junta-te à maior comunidade de jovens de STP para poderes deixar a tua opinião, interagir com o autor e publicares as tuas próprias ideias.</p>
                        <button onClick={() => navigate('/signup')} className="bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-md hover:bg-green-700 transition">
                            Criar Conta Grátis
                        </button>
                    </div>
                )}
            </div>

            {/* Popup Global de Comentários */}
            {showComments && (
                <CommentsSection 
                    postId={id} 
                    isOpen={showComments} 
                    onClose={() => setShowComments(false)} 
                    commentCount={post.commentCount || 0} 
                />
            )}
        </div>
    );
};
