import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, Feather, HeartHandshake, FileWarning } from 'lucide-react';

export const BlogRulesModal = ({ isOpen, onClose, onAccept }) => {
    const [acceptedRules, setAcceptedRules] = useState({
        respect: false,
        noHate: false,
        quality: false,
    });

    if (!isOpen) return null;

    const allAccepted = Object.values(acceptedRules).every(v => v === true);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute right-0 top-0 opacity-10">
                        <ShieldAlert size={120} className="-mr-4 -mt-4 text-white" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-yellow-500 font-bold text-xs uppercase tracking-widest mb-1 flex items-center gap-1">
                            <ShieldAlert size={12} /> Regra de Ouro
                        </p>
                        <h2 className="text-white text-xl font-extrabold">Criadores de Conteúdo</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition bg-white/10 rounded-full p-2 relative z-10 backdrop-blur-sm">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                        A plataforma <span className="font-bold text-green-600">JovensSTP</span> é um espaço de crescimento e colaboração. Para publicar artigos no nosso Blog, precisas de confirmar as regras fundamentais.
                    </p>

                    <div className="space-y-4">
                        {/* Regra 1 */}
                        <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${acceptedRules.quality ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:border-gray-200'}`}>
                            <div className="mt-0.5">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500" 
                                    checked={acceptedRules.quality}
                                    onChange={(e) => setAcceptedRules({...acceptedRules, quality: e.target.checked})}
                                />
                            </div>
                            <div>
                                <h3 className={`font-bold flex items-center gap-1.5 ${acceptedRules.quality ? 'text-green-800' : 'text-gray-900'}`}>
                                    <Feather size={16} className={acceptedRules.quality ? 'text-green-600' : 'text-gray-400'} /> 
                                    Partilhar Valor
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">Os meus artigos são focados em partilhar conhecimento, dicas ou experiências úteis para outros jovens.</p>
                            </div>
                        </label>

                        {/* Regra 2 */}
                        <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${acceptedRules.respect ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:border-gray-200'}`}>
                            <div className="mt-0.5">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500" 
                                    checked={acceptedRules.respect}
                                    onChange={(e) => setAcceptedRules({...acceptedRules, respect: e.target.checked})}
                                />
                            </div>
                            <div>
                                <h3 className={`font-bold flex items-center gap-1.5 ${acceptedRules.respect ? 'text-green-800' : 'text-gray-900'}`}>
                                    <HeartHandshake size={16} className={acceptedRules.respect ? 'text-green-600' : 'text-gray-400'} />
                                    Respeito Mútuo
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">Serei sempre respeitador, mantendo debates construtivos, mesmo na divergência de opiniões.</p>
                            </div>
                        </label>

                        {/* Regra 3 */}
                        <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${acceptedRules.noHate ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:border-gray-200'}`}>
                            <div className="mt-0.5">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500" 
                                    checked={acceptedRules.noHate}
                                    onChange={(e) => setAcceptedRules({...acceptedRules, noHate: e.target.checked})}
                                />
                            </div>
                            <div>
                                <h3 className={`font-bold flex items-center gap-1.5 ${acceptedRules.noHate ? 'text-green-800' : 'text-gray-900'}`}>
                                    <FileWarning size={16} className={acceptedRules.noHate ? 'text-green-600' : 'text-gray-400'} />
                                    Zero Tolerância ao Ódio
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">Compreendo que discursos de ódio, insultos ou spam resultam na remoção automática da minha conta pelo Guardian AI.</p>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.02)] z-10">
                    <button 
                        onClick={onAccept}
                        disabled={!allAccepted}
                        className={`w-full py-3.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all duration-300 ${allAccepted ? 'bg-green-600 text-white shadow-lg shadow-green-600/30 hover:bg-green-700 hover:scale-[1.02]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    >
                        {allAccepted ? <><CheckCircle2 size={18}/> Eu concordo, Continuar</> : 'Tens de aceitar os 3 termos acima'}
                    </button>
                    <p className="text-center text-[10px] text-gray-400 mt-3 px-4">
                        O conteúdo é sujeito a moderação automatizada e revisão da comunidade.
                    </p>
                </div>

            </div>
        </div>
    );
};
