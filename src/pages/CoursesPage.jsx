import { useState, useEffect } from 'react';
import { VOCATIONAL_TEST, CAREER_RESOURCES, SCHOOL_RESOURCES } from '../services/orientationService';
import { Guardian } from '../utils/securityUtils';
import toast from 'react-hot-toast';
import YouTubeService from '../services/youtubeService';
import CourseCard from '../components/courses/CourseCard';
import CoursePlayer from '../components/courses/CoursePlayer';
import QuizRunner from '../components/courses/QuizRunner';
import { uploadEducationalMaterial } from '../services/storage';
import { useAuth } from '../hooks/useAuth';
import AIService from '../services/aiService';
import AIQuizButton from '../components/courses/AIQuizButton';
import { Zap, ArrowRight } from 'lucide-react';
import '../styles/courses.css';

export default function CoursesPage({ isTab = false }) {
    const { user, userType } = useAuth();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [activeSubTab, setActiveSubTab] = useState('courses');
    const [schoolFilter, setSchoolFilter] = useState('all');
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [submission, setSubmission] = useState({ title: '', link: '', category: '10-12', description: '', type: 'link' });
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [communityResources, setCommunityResources] = useState([]);
    const [fetchingAcademy, setFetchingAcademy] = useState(false);

    // Debugging helpers
    useEffect(() => {
        console.log('[CoursesPage] Data Check:', {
            hasVocationalTest: !!VOCATIONAL_TEST,
            resourcesCount: Array.isArray(CAREER_RESOURCES) ? CAREER_RESOURCES.length : 'NOT AN ARRAY'
        });
    }, []);

    const quizzes = [
        VOCATIONAL_TEST,
        {
            id: 'q2',
            title: 'Básico de Empreendedorismo',
            questionsCount: 15,
            time: '10 min',
            mockQuestions: [
                { text: "O que é ROI?", options: ["Retorno sobre Investimento", "Risco Operacional Interno", "Receita Organizada", "Nenhuma das anteriores"], correct: 0 }
            ]
        },
        { id: 'q3', title: 'Lógica de Programação', questionsCount: 8, time: '8 min' },
    ];

    useEffect(() => {
        loadCourses();
        loadAcademyContent();
    }, []);

    const loadAcademyContent = async () => {
        setFetchingAcademy(true);
        try {
            const { getAcademyContent } = await import('../services/academy');
            const data = await getAcademyContent();
            setCommunityResources(data);
        } catch (error) {
            console.error('Error fetching academy resources:', error);
        } finally {
            setFetchingAcademy(false);
        }
    };

    const loadCourses = async () => {
        setLoading(true);
        try {
            const data = await YouTubeService.getAllCourses();
            setCourses(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error('Erro ao carregar cursos do YouTube');
            console.error('[CoursesPage] Error loading courses:', error);
            setCourses([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (material) => {
        if (!material || !material.url) {
            toast.error('Erro ao abrir material: Link inválido');
            return;
        }
        try {
            // Check for illicit patterns before opening
            if (!Guardian.validateUrl(material.url)) {
                toast.error('Conteúdo bloqueado por segurança!');
                return;
            }
            window.open(material.url, '_blank', 'noopener,noreferrer');
            toast.success(`A abrir: ${material.title}`);
        } catch (err) {
            toast.error('Pop-up bloqueado ou erro ao abrir link');
        }
    };

    const handleSubmitMaterial = async (e) => {
        e.preventDefault();

        if (!user) {
            toast.error('Faz login para partilhar conteúdo!');
            return;
        }

        // Guardian Checks (Pre-AI)
        const checkTitle = Guardian.validateText(submission.title);
        const checkDesc = Guardian.validateText(submission.description);

        if (!checkTitle.clean || !checkDesc.clean) {
            toast.error('⚠️ Conteúdo impróprio detectado! O envio foi bloqueado.');
            return;
        }

        if (submission.type === 'link' && !Guardian.validateUrl(submission.link)) {
            toast.error('⚠️ Link inválido ou inseguro!');
            return;
        }

        setUploading(true);
        try {
            let finalUrl = submission.link;

            // 1. Handle File Upload if needed
            if (submission.type !== 'link' && selectedFile) {
                toast.loading(`A carregar ${submission.type.toUpperCase()}...`, { id: 'upload' });
                finalUrl = await uploadEducationalMaterial(user.uid, selectedFile, submission.type);
                toast.success('Upload concluído!', { id: 'upload' });
            }

            // 2. AI Enrichment "Cérebro da Academia"
            toast.loading('🧠 A IA está a ler e a enriquecer o teu conteúdo...', { id: 'ai' });

            const [aiSummary, aiTags] = await Promise.all([
                AIService.summarize(submission.description, submission.title),
                AIService.generateTags(submission.description, submission.title)
            ]);

            const enrichedData = {
                ...submission,
                link: finalUrl,
                authorId: user.uid,
                authorName: user.displayName || 'Utilizador JovemSTP',
                authorType: userType,
                aiSummary,
                aiTags,
                // aiQuiz removed
                status: 'pending', // Needs moderation
                pointsEarned: 10
            };

            // 3. Save to Firestore
            const { addAcademyContent } = await import('../services/academy');
            const result = await addAcademyContent(enrichedData);

            if (result.success) {
                toast.success('🧠 Conteúdo enriquecido pela IA e enviado com sucesso!', { id: 'ai' });
                setShowSubmitModal(false);
                setSubmission({ title: '', link: '', category: '10-12', description: '', type: 'link' });
                setSelectedFile(null);
            } else {
                throw new Error('Erro ao salvar no banco de dados');
            }
        } catch (err) {
            console.error('[CoursesPage] Submit error:', err);
            toast.error('Erro ao processar material. Tente novamente.', { id: 'ai' });
        } finally {
            setUploading(false);
        }
    };

    const filteredCourses = filter === 'all'
        ? courses
        : courses.filter(c => {
            if (!c || !c.category) return false;
            const catName = YouTubeService.getCategoryName(filter);
            return (catName && c.category.toLowerCase() === catName.toLowerCase()) ||
                c.category.toLowerCase() === filter.toLowerCase();
        });

    if (loading) {
        return (
            <div className={`courses-page ${isTab ? 'tab-mode' : ''}`}>
                <div className="flex flex-col items-center justify-center p-20">
                    <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-500 font-medium italic">A preparar o teu futuro...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`courses-page ${isTab ? 'tab-mode' : ''}`}>
            {!isTab && (
                <header className="courses-header mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">🎓 Academia Jovem</h1>
                    <p className="text-gray-600">Cursos, materiais e quizzes para o teu sucesso em STP</p>
                </header>
            )}

            {/* Sub-tabs Navigation */}
            <div className="flex border-b border-gray-200 mb-8 overflow-x-auto scrollbar-hide sticky top-0 bg-gray-50 z-10">
                <button
                    key="explore"
                    className={`flex-1 min-w-[100px] py-4 text-sm font-semibold border-b-2 transition-all ${activeSubTab === 'courses'
                        ? 'border-indigo-600 text-indigo-600 scale-105'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                    onClick={() => setActiveSubTab('courses')}
                >
                    🧭 Explorar
                </button>
                <button
                    key="quizzes"
                    className={`flex-1 min-w-[100px] py-4 text-sm font-semibold border-b-2 transition-all ${activeSubTab === 'quizzes'
                        ? 'border-green-600 text-green-600 scale-105'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                    onClick={() => setActiveSubTab('quizzes')}
                >
                    📝 Quizzes
                </button>
            </div>

            {/* Content: Cursos */}
            {
                activeSubTab === 'courses' && (
                    <div className="animate-in fade-in duration-500">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide flex-1 min-w-0 mask-gradient-right px-1">
                                {[
                                    { id: 'all', label: 'Todos' },
                                    { id: 'agriculture', label: 'Agricultura 🇸🇹' },
                                    { id: 'tourism', label: 'Turismo 🏖️' },
                                    { id: 'tech', label: 'Tecnologia 💻' },
                                    { id: 'business', label: 'Negócios 📈' },
                                    { id: 'career', label: 'Carreira 🚀' },
                                    { id: 'youth_orientation', label: 'Orientação Jovem 🗣️' }, // Added
                                    { id: '10-12', label: 'Secundário 🎓' },
                                    { id: 'Superior', label: 'Universidade 🏛️' },
                                    { id: 'general', label: 'Saber Geral 🌍' }
                                ].map(f => (
                                    <button
                                        key={f.id}
                                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap border shrink-0 ${filter === f.id
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105'
                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-indigo-200'
                                            }`}
                                        onClick={() => setFilter(f.id)}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setShowSubmitModal(true)}
                                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black hover:bg-indigo-700 transition-all shrink-0 shadow-lg shadow-indigo-200 active:scale-95 flex items-center gap-2"
                            >
                                <span>+</span> PARTILHAR
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
                            {filteredCourses.length === 0 ? (
                                <div className="col-span-full text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100">
                                    <div className="text-4xl mb-4">🔍</div>
                                    <h3 className="text-lg font-bold text-gray-900">Sem cursos nesta categoria</h3>
                                    <p className="text-gray-500">Tenta mudar o filtro ou volta mais tarde.</p>
                                </div>
                            ) : (
                                filteredCourses.map(course => (
                                    <CourseCard
                                        key={course.id}
                                        course={course}
                                        onEnroll={() => setSelectedCourse(course)}
                                    />
                                ))
                            )}
                        </div>

                        <div className="mt-12 mb-6 flex items-center justify-between">
                            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                📚 Materiais & Recursos
                                <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{communityResources.length + (Array.isArray(SCHOOL_RESOURCES) ? SCHOOL_RESOURCES.length : 0)} items</span>
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Static Resources (Legacy) */}
                            {(!fetchingAcademy) &&
                                [...communityResources, ...(Array.isArray(SCHOOL_RESOURCES) ? SCHOOL_RESOURCES : []), ...(Array.isArray(CAREER_RESOURCES) ? CAREER_RESOURCES : [])]
                                    .filter(r => filter === 'all' || (r.categoryId === filter || r.categoryId === filter)) // Check both for now, assume resources updated
                                    .filter(r => filter === 'all' || (r.category && (r.categoryId === filter || r.category === filter || r.category.toLowerCase() === filter.toLowerCase())))
                                    .map((resource, idx) => {
                                        const isAI = !!resource.aiSummary;
                                        return (
                                            <div key={idx} className={`bg-white p-6 rounded-3xl border shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col justify-between ${isAI ? 'border-indigo-100 hover:border-indigo-300' : 'border-gray-100'}`}>
                                                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                                <div className="flex items-start gap-4 mb-4">
                                                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xs uppercase shadow-inner group-hover:bg-indigo-100 transition-colors shrink-0">
                                                        {resource.type || 'Biblio'}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <span className="text-[10px] font-black px-2 py-1 bg-gray-100 text-gray-500 rounded-lg uppercase tracking-tight">
                                                                {YouTubeService.getCategoryName(resource.category || 'general')}
                                                            </span>
                                                            {resource.aiTags?.map((tag, tIdx) => (
                                                                <span key={tIdx} className="text-[10px] font-black px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg uppercase tracking-tight flex items-center gap-1">
                                                                    <Zap size={10} fill="currentColor" /> {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <h4 className="font-black text-gray-800 group-hover:text-indigo-950 transition-colors uppercase text-sm leading-tight mb-2">
                                                            {resource.title}
                                                        </h4>
                                                        <p className="text-xs text-gray-500 font-medium leading-relaxed line-clamp-2">
                                                            {resource.aiSummary || resource.description}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                                                    <div className="flex items-center gap-3">
                                                        {isAI && (
                                                            <AIQuizButton material={resource} />
                                                        )}
                                                        <button
                                                            onClick={() => handleDownload({ url: resource.link || resource.url, title: resource.title })}
                                                            className="text-xs font-black text-gray-400 hover:text-indigo-600 transition-colors flex items-center gap-1.5"
                                                        >
                                                            <ArrowRight size={14} /> ACEDER
                                                        </button>
                                                    </div>
                                                    <div className="text-[9px] font-bold text-gray-300 uppercase italic">
                                                        Por: {resource.authorName || 'JovemSTP'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            {fetchingAcademy && (
                                <div className="col-span-full py-10 flex flex-col items-center gap-3">
                                    <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                    <p className="text-xs text-gray-400 font-bold uppercase">A carregar biblioteca inteligente...</p>
                                </div>
                            )}
                        </div>

                        {/* Submit Modal */}
                        {showSubmitModal && (
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                                <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                                    <div className="bg-white border-b border-gray-100 p-7 flex justify-between items-center sticky top-0 z-20">
                                        <div className="space-y-1">
                                            <h3 className="text-2xl font-black text-indigo-950 tracking-tight">Partilhar com a Comunidade</h3>
                                            <p className="text-gray-500 text-sm font-medium flex items-center gap-2">
                                                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                                                {userType === 'teacher' ? 'Docente: Partilhe o seu saber' : 'Jovem: Ajuda os teus colegas'} em STP
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setShowSubmitModal(false)}
                                            className="bg-gray-50 text-gray-400 p-2.5 rounded-xl hover:bg-gray-100 hover:text-gray-600 transition-all active:scale-95"
                                            aria-label="Fechar"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                    </div>
                                    <form onSubmit={handleSubmitMaterial} className="bg-white p-8 space-y-6 max-h-[70vh] overflow-y-auto thin-scrollbar">
                                        {/* Tipo de Conteúdo - Visual Selection */}
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 uppercase mb-3 ml-1">O que vais partilhar?</label>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {[
                                                    { id: 'link', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>, label: 'Link' },
                                                    { id: 'pdf', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>, label: 'PDF' },
                                                    { id: 'video', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"></path><rect width="14" height="12" x="2" y="6" rx="2" ry="2"></rect></svg>, label: 'Vídeo' },
                                                    { id: 'record', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>, label: 'Áudio' }
                                                ].map((type) => (
                                                    <button
                                                        key={type.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSubmission({ ...submission, type: type.id });
                                                            setSelectedFile(null);
                                                        }}
                                                        className={`btn-type-selector flex flex-col items-center gap-1 group border-2 ${submission.type === type.id ? 'active border-indigo-500 shadow-indigo-100' : 'border-gray-50'}`}
                                                    >
                                                        <span className={`transition-transform group-hover:scale-110 ${submission.type === type.id ? 'text-indigo-600' : 'text-gray-500'}`}>{type.icon}</span>
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${submission.type === type.id ? 'text-indigo-600' : 'text-gray-400'}`}>
                                                            {type.label}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="modal-input-group">
                                                <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Título do Material</label>
                                                <input
                                                    value={submission.title}
                                                    onChange={(e) => setSubmission({ ...submission, title: e.target.value })}
                                                    type="text"
                                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white outline-none transition-all font-bold text-sm"
                                                    placeholder="Ex: Resumo de Genética ou Gestão"
                                                    required
                                                />
                                            </div>
                                            <div className="modal-input-group">
                                                <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Nível de Ensino</label>
                                                <select
                                                    value={submission.category}
                                                    onChange={(e) => setSubmission({ ...submission, category: e.target.value })}
                                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-100"
                                                >
                                                    <option value="all">Escolha a Categoria...</option>
                                                    <option value="10-12">Ensino Secundário</option>
                                                    <option value="Superior">Ensino Superior</option>
                                                    <option value="agriculture">Agricultura & Pescas</option>
                                                    <option value="tourism">Turismo & Hospitalidade</option>
                                                    <option value="tech">Tecnologia & Inovação</option>
                                                    <option value="business">Negócios & Empreendedorismo</option>
                                                    <option value="career">Dicas de Carreira</option>
                                                    <option value="general">Saber Geral / Outros</option>
                                                </select>
                                            </div>
                                        </div>

                                        {submission.type === 'link' ? (
                                            <div className="modal-input-group">
                                                <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Endereço (URL)</label>
                                                <div className="relative">
                                                    <input
                                                        value={submission.link}
                                                        onChange={(e) => setSubmission({ ...submission, link: e.target.value })}
                                                        type="url"
                                                        className="w-full p-4 pl-12 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white outline-none transition-all font-medium text-sm"
                                                        placeholder="https://drive.google.com/..."
                                                        required={submission.type === 'link'}
                                                    />
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔗</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={`file-upload-zone p-8 rounded-3xl text-center cursor-pointer ${selectedFile ? 'active' : ''}`}>
                                                <label className="cursor-pointer block">
                                                    <div className="text-4xl mb-3">{submission.type === 'pdf' ? '📄' : '🎥'}</div>
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-black text-gray-800">
                                                            {selectedFile ? 'Ficheiro Selecionado!' : 'Clica para escolher o ficheiro'}
                                                        </p>
                                                        <p className="text-xs text-gray-400 font-medium">
                                                            {selectedFile ? selectedFile.name : `Formatos aceites: ${submission.type === 'pdf' ? '.pdf' : '.mp4, .mov'}`}
                                                        </p>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept={submission.type === 'pdf' ? '.pdf' : 'video/*'}
                                                        onChange={(e) => setSelectedFile(e.target.files[0])}
                                                        className="hidden"
                                                        required={submission.type !== 'link'}
                                                    />
                                                </label>
                                            </div>
                                        )}

                                        <div className="modal-input-group">
                                            <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Descrição Educativa</label>
                                            <textarea
                                                value={submission.description}
                                                onChange={(e) => setSubmission({ ...submission, description: e.target.value })}
                                                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:bg-white outline-none transition-all font-medium h-24 resize-none text-sm"
                                                placeholder="Como é que este material ajuda quem está a estudar?"
                                                required
                                            ></textarea>
                                        </div>

                                        <div className="pt-2">
                                            <button
                                                type="submit"
                                                disabled={uploading}
                                                className="w-full py-5 bg-indigo-600 text-white font-black text-lg rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                            >
                                                {uploading ? (
                                                    <>
                                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                        A PROCESSAR...
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>{userType === 'teacher' ? 'PUBLICAR NA ACADEMIA' : 'PARTILHAR CONHECIMENTO'}</span>
                                                        <span className="text-xl">🚀</span>
                                                    </>
                                                )}
                                            </button>
                                            <p className="text-[10px] text-center text-gray-400 mt-4 font-bold uppercase tracking-widest">
                                                {userType === 'teacher' ? 'CONTEÚDO DE DOCENTE VERIFICADO' : 'GANHA +10 PONTOS DE MENTOR POR PARTILHA'}
                                            </p>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        <div className="mt-8 p-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl text-white shadow-xl flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="text-4xl">🏅</div>
                                <div>
                                    <h4 className="font-black uppercase tracking-tighter text-lg">Ranking de Mentores</h4>
                                    <p className="text-blue-100 text-xs">Os estudantes mais ativos ganham destaque em toda a rede de STP.</p>
                                </div>
                            </div>
                            <div className="bg-white/20 px-4 py-2 rounded-xl font-bold text-sm">Em breve</div>
                        </div>
                    </div>
                )
            }



            {/* Content: Quizzes */}
            {
                activeSubTab === 'quizzes' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-4 duration-300">
                        {quizzes.map((quiz, idx) => (
                            <div
                                key={idx}
                                onClick={() => setSelectedQuiz(quiz)}
                                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-green-200 transition-all cursor-pointer group flex flex-col justify-between"
                            >
                                <div>
                                    <h4 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-green-600 transition-colors">{quiz.title}</h4>
                                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-6 font-bold uppercase tracking-tighter">
                                        <span className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-md">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                            {quiz.time || '10 min'}
                                        </span>
                                        <span className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-md">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                            {quiz.questions?.length || quiz.questionsCount || 0} Qs
                                        </span>
                                    </div>
                                </div>
                                <button className="w-full py-3 bg-green-50 text-green-700 font-black rounded-xl text-sm group-hover:bg-green-600 group-hover:text-white transition-all shadow-sm">
                                    {quiz.id === 'vocational-1' ? 'DESCOBRIR MEU PERFIL' : 'COMEÇAR QUIZ'}
                                </button>
                            </div>
                        ))}
                    </div>
                )
            }



            {/* Modals */}
            {
                selectedCourse && (
                    <CoursePlayer
                        course={selectedCourse}
                        onClose={() => setSelectedCourse(null)}
                    />
                )
            }

            {
                selectedQuiz && (
                    <QuizRunner
                        quiz={selectedQuiz}
                        onClose={() => setSelectedQuiz(null)}
                    />
                )
            }
        </div >
    );
}
