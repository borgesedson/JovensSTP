import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import CourseService from '../../services/courseService';
import toast from 'react-hot-toast';

export default function CourseCard({ course, onEnroll }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isHovered, setIsHovered] = useState(false);
    const [enrolling, setEnrolling] = useState(false);

    const handleCardClick = () => {
        if (onEnroll) {
            onEnroll(course);
        } else {
            navigate(`/courses/${course.id}`);
        }
    };

    const handleEnroll = async (e) => {
        e.stopPropagation();
        if (!user) {
            toast.error('Faça login para começar 🚀');
            navigate('/login');
            return;
        }

        setEnrolling(true);
        try {
            const result = await CourseService.enrollCourse(user.uid, course);
            if (result.alreadyEnrolled) {
                toast.success('De volta aos estudos! 📚');
            } else {
                toast.success('Inscrição confirmada! Vamos lá! 🔥');
            }
            onEnroll ? onEnroll(course) : navigate(`/courses/${course.id}`);
        } catch (error) {
            toast.error('Erro ao acessar. Tenta de novo!');
        } finally {
            setEnrolling(false);
        }
    };

    return (
        <div
            className="group relative bg-white rounded-xl overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 cursor-pointer flex flex-col h-full"
            onClick={handleCardClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Thumbnail Section */}
            <div className="relative aspect-video overflow-hidden bg-gray-100">
                <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                {/* Level Badge */}
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase text-gray-800 shadow-sm border border-white/50">
                    {course.level || 'Iniciante'}
                </div>

                {/* Play Button Overlay (Visible on Hover) */}
                <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/50 shadow-lg">
                        <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-1" />
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-5 flex flex-col flex-1">
                {/* Category & Rating */}
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md uppercase tracking-wide">
                        {course.category}
                    </span>
                    <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                        <span>★</span>
                        <span>{course.rating || '4.5'}</span>
                    </div>
                </div>

                {/* Title */}
                <h3 className="font-bold text-gray-900 text-lg leading-tight mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                    {course.title}
                </h3>

                {/* Instructor */}
                <div className="flex items-center gap-2 mb-4">
                    <img
                        src={course.instructor?.avatar || 'https://ui-avatars.com/api/?name=STP'}
                        alt="Instructor"
                        className="w-6 h-6 rounded-full border border-gray-200"
                    />
                    <span className="text-xs text-gray-500 font-medium truncate">
                        {course.instructor?.name || 'Academia Jovem'}
                    </span>
                </div>

                {/* Footer Stats - Pushed to bottom */}
                <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                        <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                            {course.lessonsCount || 10} aulas
                        </span>
                        <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {Math.round((course.duration || 3600) / 60)} min
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
