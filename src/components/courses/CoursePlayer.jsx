import { useState, useEffect } from 'react';
import { X, Play, AlertCircle } from 'lucide-react';

export default function CoursePlayer({ course, onClose }) {
    // 1. Fail-safe for missing course
    if (!course) return null;

    // 2. Safe access to lessons
    const lessons = Array.isArray(course.lessons) ? course.lessons : [];
    const hasLessons = lessons.length > 0;

    // 3. State initialization
    const [currentLesson, setCurrentLesson] = useState(hasLessons ? lessons[0] : null);

    // 4. Update currentLesson if course changes
    useEffect(() => {
        if (hasLessons) {
            setCurrentLesson(lessons[0]);
        }
    }, [course.id]); // Update when course ID changes

    // 5. Error View
    if (!hasLessons) {
        return (
            <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl p-8 max-w-sm w-full text-center shadow-2xl">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-500 font-bold mb-4">Conteúdo Indisponível</p>
                    <button
                        onClick={onClose}
                        className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        );
    }

    // 6. Safe Lesson Render
    const safeLesson = currentLesson || lessons[0];

    return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col md:flex-row">
            {/* --- Main Video Area --- */}
            <div className="flex-1 bg-black flex flex-col relative">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 left-4 z-50 p-2 bg-black/60 text-white rounded-full hover:bg-gray-800"
                    aria-label="Fechar"
                >
                    <X size={24} />
                </button>

                {/* Video Container */}
                <div className="flex-1 flex items-center justify-center bg-black p-4">
                    <div className="relative w-full max-w-5xl aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
                        {safeLesson?.id ? (
                            <iframe
                                width="100%"
                                height="100%"
                                src={`https://www.youtube.com/embed/${safeLesson.id}?autoplay=1&rel=0&modestbranding=1`}
                                title={safeLesson.title || 'Video'}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="absolute inset-0 w-full h-full"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                <p>Erro ao carregar vídeo.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Video Info */}
                <div className="bg-gray-900 text-white p-6 border-t border-gray-800">
                    <h2 className="text-xl font-bold mb-2 text-white">
                        {safeLesson?.title || 'Sem Título'}
                    </h2>
                    <p className="text-gray-400 text-sm line-clamp-2">
                        {safeLesson?.description || course.description || 'Sem descrição.'}
                    </p>
                </div>
            </div>

            {/* --- Sidebar Playlist --- */}
            <div className="w-full md:w-96 bg-white border-l border-gray-200 flex flex-col h-[40vh] md:h-full">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">
                        {course.title}
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">
                        {lessons.length} aulas • {course.instructor?.name || 'JovemSTP'}
                    </p>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {lessons.map((lesson, idx) => (
                        <button
                            key={lesson.id || idx}
                            onClick={() => setCurrentLesson(lesson)}
                            className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors border ${safeLesson?.id === lesson.id
                                    ? 'bg-indigo-50 border-indigo-200'
                                    : 'bg-white border-transparent hover:bg-gray-50'
                                }`}
                        >
                            <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${safeLesson?.id === lesson.id
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-400'
                                }`}>
                                {safeLesson?.id === lesson.id ? <Play size={10} fill="currentColor" /> : idx + 1}
                            </div>

                            <div className="min-w-0">
                                <h4 className={`text-sm font-semibold line-clamp-2 mb-0.5 ${safeLesson?.id === lesson.id ? 'text-indigo-900' : 'text-gray-700'
                                    }`}>
                                    {lesson.title || `Aula ${idx + 1}`}
                                </h4>
                                <span className="text-[10px] text-gray-400">
                                    {lesson.duration || 'Video'}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
