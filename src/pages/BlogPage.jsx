import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, Search, Clock, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

export const BlogPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const q = query(collection(db, 'blog_posts'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPosts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPosts(fetchedPosts);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const categories = ['Todos', ...Array.from(new Set(posts.map(p => p.category).filter(Boolean)))];

    const filteredPosts = posts.filter(post => {
        const catA = selectedCategory?.trim().toLowerCase();
        const catB = post.category?.trim().toLowerCase();
        const matchesCategory = selectedCategory === 'Todos' || catA === catB;
        
        const matchesSearch = post.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              post.authorName?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const isFiltering = selectedCategory !== 'Todos' || searchQuery !== '';
    const featuredPost = (!isFiltering && filteredPosts.length > 0) ? filteredPosts[0] : null;
    const regularPosts = featuredPost ? filteredPosts.slice(1) : filteredPosts;

    const BlogCard = ({ post }) => (
        <div 
            onClick={() => navigate(`/blog/${post.id}`)}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 cursor-pointer hover:shadow-md transition group overflow-hidden"
        >
            {post.coverImage && (
                <div className="h-48 rounded-xl overflow-hidden mb-4 relative">
                    <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    {post.category && (
                         <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-green-700">
                             {post.category}
                         </div>
                    )}
                </div>
            )}
            
            <h3 className="font-bold text-lg text-gray-900 leading-tight mb-2 group-hover:text-green-600 transition line-clamp-2">
                {post.title}
            </h3>
            
            <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                {post.excerpt || post.content?.replace(/<[^>]+>/g, '').substring(0, 100) + '...'}
            </p>
            
            <div className="flex items-center justify-between border-t border-gray-50 pt-4 mt-auto">
                <div className="flex items-center gap-2">
                    {post.authorAvatar ? (
                        <img src={post.authorAvatar} alt={post.authorName} className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-[10px]">
                            {post.authorName?.charAt(0) || 'U'}
                        </div>
                    )}
                    <span className="text-xs font-medium text-gray-700">{post.authorName}</span>
                </div>
                <div className="flex items-center text-xs text-gray-400 gap-3">
                    <span className="flex items-center gap-1"><Clock size={12}/> {post.readTime || '3'} min</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="pt-[72px] pb-[72px] min-h-screen bg-gray-50 flex flex-col items-center">
            <div className="w-full max-w-xl mx-auto px-4 relative">
                
                {/* Header & Search */}
                <div className="py-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-extrabold text-gray-900">JovensSTP Blog</h1>
                            <p className="text-sm text-gray-500">Ideias, conhecimento e inovação para o futuro.</p>
                        </div>
                        {user && (
                            <button 
                                onClick={() => navigate('/blog/create')}
                                className="bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-green-600/30 hover:bg-green-700 transition"
                            >
                                <Plus size={20} />
                            </button>
                        )}
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Pesquisar artigos..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-gray-200 pl-10 pr-4 py-3 rounded-2xl focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition text-sm shadow-sm"
                        />
                    </div>
                </div>

                {/* Categories */}
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 mb-4 -mx-4 px-4 snap-x">
                    {categories.map((cat, idx) => (
                        <button
                            key={idx}
                            onClick={() => setSelectedCategory(cat)}
                            className={`snap-start whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                                selectedCategory === cat 
                                ? 'bg-gray-900 text-white shadow-md' 
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Loading State */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mb-4"></div>
                        <p className="text-gray-500 text-sm">A carregar artigos brilhantes...</p>
                    </div>
                ) : (
                    <>
                        {/* Featured Post (First one) */}
                        {featuredPost && selectedCategory === 'Todos' && !searchQuery && (
                            <div className="mb-8">
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                                    <Tag size={14} className="text-green-500" /> Destaque
                                </h2>
                                <div 
                                    onClick={() => navigate(`/blog/${featuredPost.id}`)}
                                    className="bg-gradient-to-br from-green-600 to-emerald-800 rounded-3xl p-8 text-white shadow-xl shadow-green-900/20 cursor-pointer relative overflow-hidden group min-h-[280px] flex flex-col justify-end"
                                >
                                    {featuredPost.coverImage && (
                                        <>
                                            <img 
                                                src={featuredPost.coverImage} 
                                                alt="" 
                                                className="absolute inset-0 w-full h-full object-cover transition duration-700 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent group-hover:from-black/90 transition-all"></div>
                                        </>
                                    )}
                                    
                                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl z-0"></div>
                                    
                                    <div className="relative z-10">
                                        <div className="bg-green-500/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase inline-block mb-3 border border-white/20">
                                            🌟 Novo Artigo
                                        </div>
                                        <h3 className="font-extrabold text-2xl md:text-3xl leading-tight mb-2 group-hover:translate-x-1 transition trasform duration-300">
                                            {featuredPost.title}
                                        </h3>
                                        <p className="text-gray-100 text-sm line-clamp-2 mb-6 opacity-90">
                                            {featuredPost.excerpt || featuredPost.content?.replace(/<[^>]+>/g, '').substring(0, 120) + '...'}
                                        </p>
                                        <div className="flex justify-between items-center border-t border-white/20 pt-5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-[10px] font-bold">
                                                    {featuredPost.authorName?.charAt(0)}
                                                </div>
                                                <span className="text-xs font-medium opacity-90">{featuredPost.authorName}</span>
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-white text-green-700 flex items-center justify-center shadow-lg group-hover:bg-green-50 transition transform group-hover:rotate-[-45deg] duration-300">
                                                <ChevronRight size={20} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Regular Posts List */}
                        <div className="pb-10">
                            {featuredPost || regularPosts.length > 0 ? (
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
                                    Últimos Artigos
                                </h2>
                            ) : (
                                <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 p-6">
                                    <div className="text-4xl mb-3">📝</div>
                                    <h3 className="text-gray-900 font-bold mb-1">Nenhum artigo encontrado</h3>
                                    <p className="text-gray-500 text-sm">Que tal seres o primeiro a escrever algo sobre isto?</p>
                                    {user && (
                                        <button 
                                            onClick={() => navigate('/blog/create')}
                                            className="mt-4 text-green-600 font-bold text-sm bg-green-50 px-4 py-2 rounded-full hover:bg-green-100 transition"
                                        >
                                            Escrever Agora
                                        </button>
                                    )}
                                </div>
                            )}

                            {regularPosts.map(post => (
                                <BlogCard key={post.id} post={post} />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
