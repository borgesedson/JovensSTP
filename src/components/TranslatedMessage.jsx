import React, { useEffect, useState } from 'react';
import { MessageSimple, useMessageContext } from 'stream-chat-react';
import { useLanguage } from '../contexts/LanguageContext';
import VPSService from '../services/VPSService';
import { Languages, Volume2 } from 'lucide-react';

export const TranslatedMessage = (props) => {
    const { message, isMyMessage } = useMessageContext();
    const { preferredLanguage } = useLanguage();
    const [translation, setTranslation] = useState(null);

    // Call isMyMessage() to determine alignment
    const isMine = isMyMessage ? isMyMessage() : (message?.user?.id && message.user.id !== 'other'); // fallback if isMyMessage isn't available

    useEffect(() => {
        const translateIfNeeded = async () => {
            if (!message.text || message.text.length < 2) return;
            try {
                console.log('🔄 Requesting translation for:', message.text.substring(0, 20) + '...', 'to:', preferredLanguage);
                const result = await VPSService.translate(message.text, preferredLanguage);
                console.log('✅ Translation result:', result);
                
                if (result && result.translatedText) {
                    if (result.translatedText.toLowerCase().trim() !== message.text.toLowerCase().trim()) {
                        setTranslation(result.translatedText);
                    }
                }
            } catch (error) {
                console.error('❌ Translation failed for message:', message.id, error);
            }
        };

        translateIfNeeded();
    }, [message.text, preferredLanguage]);

    const handleListen = (e) => {
        e.stopPropagation();
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(translation || message.text);
            utterance.lang = preferredLanguage;
            window.speechSynthesis.speak(utterance);
        }
    };

    return (
        <div className="flex flex-col mb-2 relative">
            <MessageSimple {...props} />
            
            {translation && (
                <div className={`flex mt-[-8px] z-10 ${isMine ? 'justify-end mr-2 md:mr-4' : 'justify-start ml-[44px] md:ml-12'}`}>
                    <div className={`flex items-start gap-2 max-w-[90%] md:max-w-[85%] px-3 py-2 rounded-2xl ${isMine ? 'bg-blue-50/90 border border-blue-100 text-blue-900 rounded-tr-sm shadow-sm' : 'bg-gray-100/90 border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'}`}>
                        <Languages size={14} className="mt-0.5 flex-shrink-0 opacity-60" />
                        <div className="flex-1 text-[13px] italic">
                            {translation}
                        </div>
                        <button 
                            onClick={handleListen}
                            className={`p-1 -mr-1 -mt-1 rounded-full hover:bg-black/10 transition-colors ${isMine ? 'text-blue-800' : 'text-gray-600'}`}
                            title="Ouvir tradução"
                        >
                            <Volume2 size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
