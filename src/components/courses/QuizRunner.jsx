import { useState, useEffect, useMemo, useCallback, useRef, useContext } from 'react';
import { X, Check, ArrowRight, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function QuizRunner({ quiz, onClose, isEmbedded = false }) {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [showResults, setShowResults] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false); // New state for immediate feedback
    const [answers, setAnswers] = useState([]);
    const [resultProfile, setResultProfile] = useState(null);

    // Get questions from quiz object or use default mock
    const questions = quiz.questions || quiz.mockQuestions || [
        {
            text: "Qual é o seu objetivo principal?",
            options: [
                { text: "Ganhar dinheiro", type: "business" },
                { text: "Criar coisas", type: "creative" },
                { text: "Entender como funciona", type: "tech" },
                { text: "Ajudar pessoas", type: "social" }
            ]
        }
    ];

    // Detect if this is a graded quiz (has correct answers) or a personality test
    const isGraded = useMemo(() => {
        return questions.some(q => q.correct !== undefined);
    }, [questions]);

    const handleAnswer = (option, idx) => {
        if (isAnswered) return; // Prevent changing answer after reveal

        setSelectedAnswer(option);

        // If it's a personality test, we don't show right/wrong, just select
        if (!isGraded) {
            // Logic for vocational remains simple (select -> next)
            return;
        }

        // Immediate Feedback Logic for Graded Quizzes
        setIsAnswered(true);

        const currentQuest = questions[currentQuestion];
        // Determine correctness
        const isCorrect = typeof option === 'number' // logic if option was index
            ? option === currentQuest.correct // fallback
            : idx === currentQuest.correct; // preferred: compare index

        if (isCorrect) {
            setScore(score + 1);
            // toast.success('Correto!', { duration: 1000, icon: '🎉' });
        } else {
            // toast.error('Incorreto', { duration: 1000, icon: '❌' });
            // Vibration API if available for wrong answer
            if (navigator.vibrate) navigator.vibrate(200);
        }
    };

    const handleNext = async () => {
        if (!selectedAnswer && !isAnswered && isGraded) return;
        if (!selectedAnswer && !isGraded) return;

        const answerValue = typeof selectedAnswer === 'string' ? selectedAnswer : (selectedAnswer.type || selectedAnswer.text);
        const newAnswers = [...answers, answerValue];
        setAnswers(newAnswers);

        if (currentQuestion + 1 < questions.length) {
            setCurrentQuestion(currentQuestion + 1);
            setSelectedAnswer(null);
            setIsAnswered(false);
        } else {
            // Se for o teste vocacional, calcula o perfil
            if (quiz.id === 'vocational-1') {
                const orientationModule = await import('../../services/orientationService');
                const OrientationService = orientationModule.default;
                const result = OrientationService.calculateResult(newAnswers);
                setResultProfile(result);
            }
            // Score already updated in real-time for graded
            setShowResults(true);
        }
    };

    const QuizContent = () => (
        <div className={`flex flex-col h-full ${isEmbedded ? '' : 'bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl relative max-h-[90vh]'}`}>
            {/* Header - Only show if NOT embedded (AI button has its own header) */}
            {!isEmbedded && (
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <div>
                        <span className="text-xs uppercase tracking-wider font-bold text-gray-400">Quiz</span>
                        <h2 className="text-lg font-bold text-gray-800">{quiz.title}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
                </div>
            )}

            {/* Progress Bar */}
            <div className="w-full h-1 bg-gray-100 shrink-0">
                <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                ></div>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto flex-1">
                <div className="mb-6">
                    <span className="text-sm font-bold text-indigo-600 mb-2 block">Questão {currentQuestion + 1}/{questions.length}</span>
                    <h3 className="text-xl font-bold text-gray-900 leading-relaxed">
                        {questions[currentQuestion].text || "Pergunta indisponível"}
                    </h3>
                </div>

                <div className="space-y-3">
                    {questions[currentQuestion].options.map((option, idx) => {
                        const optionText = typeof option === 'string' ? option : option.text;

                        // Determine statuses for styling
                        const isSelected = selectedAnswer === option;
                        const isCorrectIndex = idx === questions[currentQuestion].correct;

                        let buttonStyle = "border-gray-100 hover:border-indigo-200 hover:bg-gray-50 text-gray-700";
                        let icon = null;

                        if (isGraded) {
                            if (isAnswered) {
                                if (isCorrectIndex) {
                                    buttonStyle = "border-green-500 bg-green-50 text-green-800 font-bold";
                                    icon = <Check size={20} className="text-green-600" />;
                                } else if (isSelected) {
                                    buttonStyle = "border-red-500 bg-red-50 text-red-800 opacity-60";
                                    icon = <X size={20} className="text-red-600" />;
                                } else {
                                    buttonStyle = "border-gray-100 text-gray-400 opacity-50";
                                }
                            } else if (isSelected) {
                                buttonStyle = "border-indigo-500 bg-indigo-50 text-indigo-800";
                            }
                        } else {
                            // Personality test (old behavior)
                            if (isSelected) {
                                buttonStyle = "border-indigo-500 bg-indigo-50 text-indigo-800";
                                icon = <Check size={20} className="text-indigo-600" />;
                            }
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => handleAnswer(option, idx)}
                                disabled={isAnswered && isGraded}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${buttonStyle}`}
                            >
                                <span className="font-medium">{optionText}</span>
                                {icon}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
                <div className="w-full flex justify-between items-center">
                    <div>
                        {/* Hint or Feedback Text */}
                        {isAnswered && isGraded && (
                            <span className={`text-sm font-bold animate-in fade-in ${selectedAnswer === questions[currentQuestion].options[questions[currentQuestion].correct] ? 'text-green-600' : 'text-red-500'}`}>
                                {questions[currentQuestion].correct === questions[currentQuestion].options.indexOf(selectedAnswer) ? "Resposta correta! 🎉" : "Resposta incorreta."}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleNext}
                        disabled={!selectedAnswer && !isAnswered}
                        className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${(!selectedAnswer && !isAnswered)
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
                            }`}
                    >
                        {currentQuestion + 1 === questions.length ? 'Finalizar' : 'Próxima'}
                        <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );

    if (showResults) {
        if (resultProfile) {
            return (
                <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl p-8 text-center relative animate-in fade-in zoom-in duration-300">
                        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>

                        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-3xl">🎯</span>
                        </div>

                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Seu Perfil: {resultProfile.title}</h2>
                        <p className="text-gray-600 mb-6">{resultProfile.description}</p>

                        <div className="bg-indigo-50 p-6 rounded-xl mb-8 text-left">
                            <h4 className="font-bold text-indigo-900 mb-3">Carreiras Recomendadas:</h4>
                            <div className="flex flex-wrap gap-2">
                                {resultProfile.recommendations.map((rec, i) => (
                                    <span key={i} className="bg-white px-3 py-1 rounded-full text-indigo-700 text-sm font-medium border border-indigo-100 shadow-sm">
                                        {rec}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                        >
                            Ver Cursos Relacionados
                        </button>
                    </div>
                </div>
            );
        }

        const percentage = Math.round((score / questions.length) * 100);
        return (
            <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-md rounded-2xl p-8 text-center relative animate-in fade-in zoom-in duration-300">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>

                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${percentage >= 70 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                        <span className="text-3xl">{percentage >= 70 ? '🏆' : '📚'}</span>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Quiz Concluído!</h2>
                    <p className="text-gray-500 mb-6">Você acertou {score} de {questions.length} questões</p>

                    <div className={`text-5xl font-black mb-8 ${percentage >= 70 ? 'text-green-600' : 'text-amber-500'}`}>{percentage}%</div>

                    <p className="text-gray-600 mb-8 text-sm">
                        {percentage >= 70 ? 'Excelente! Você domina o assunto.' : 'Bom esforço! Que tal revisar o material e tentar de novo?'}
                    </p>

                    <button
                        onClick={onClose}
                        className={`w-full py-3 text-white rounded-xl font-bold transition-colors ${percentage >= 70 ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-800 hover:bg-gray-900'}`}
                    >
                        {percentage >= 70 ? 'Continuar Estudando' : 'Fechar e Revisar'}
                    </button>
                </div>
            </div>
        );
    }

    if (isEmbedded) {
        return <QuizContent />;
    }

    return (
        <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
            <QuizContent />
        </div>
    );
}
