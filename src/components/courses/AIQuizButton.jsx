import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import QuizRunner from './QuizRunner';
import { Brain, Star, Clock, Zap } from 'lucide-react';

export default function AIQuizButton({ material }) {
    const [showQuiz, setShowQuiz] = useState(false);

    // Ensure material.aiQuiz exists and has items
    if (!material?.aiQuiz || !Array.isArray(material.aiQuiz) || material.aiQuiz.length === 0) return null;

    return (
        <>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setShowQuiz(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-black rounded-xl hover:scale-105 transition-all shadow-lg shadow-indigo-100 active:scale-95"
            >
                <Zap size={14} fill="currentColor" />
                TESTE DE IA
            </button>

            {showQuiz && createPortal(
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-indigo-950/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                        {/* Quiz Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-8 text-white relative shrink-0">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <Brain size={120} />
                            </div>

                            <button
                                onClick={() => setShowQuiz(false)}
                                className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>

                            <div className="relative z-10">
                                <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black tracking-widest uppercase mb-4 inline-block">
                                    Flash Quiz Inteligente
                                </span>
                                <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2 line-clamp-2">{material.title}</h2>
                                <div className="flex items-center gap-4 text-indigo-100 text-sm font-medium">
                                    <span className="flex items-center gap-1.5"><Clock size={14} /> 2-3 min</span>
                                    <span className="flex items-center gap-1.5"><Star size={14} /> +5 Pontos</span>
                                </div>
                            </div>
                        </div>

                        {/* Quiz Content Area */}
                        <div className="flex-1 overflow-hidden">
                            <QuizRunner
                                isEmbedded={true}
                                quiz={{
                                    id: `ai-${material.id}`,
                                    title: material.title,
                                    mockQuestions: material.aiQuiz.map(q => {
                                        // Determine correct index robustly
                                        let correctIdx = -1;
                                        if (typeof q.correctIndex === 'number') {
                                            correctIdx = q.correctIndex;
                                        } else if (q.answer) {
                                            // Fuzzy match trial if exact match fails
                                            correctIdx = q.options.findIndex(opt => opt.trim().toLowerCase() === q.answer.trim().toLowerCase());
                                            if (correctIdx === -1) {
                                                // Fallback: try substring match? Risk of false positive but better than broken
                                                correctIdx = q.options.findIndex(opt => opt.includes(q.answer) || q.answer.includes(opt));
                                            }
                                        }
                                        // Safety default
                                        if (correctIdx === -1) correctIdx = 0;

                                        return {
                                            text: q.question,
                                            options: q.options,
                                            correct: correctIdx
                                        };
                                    })
                                }}
                                onClose={() => setShowQuiz(false)}
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
