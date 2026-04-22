import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
    const { user } = useAuth();
    const [preferredLanguage, setPreferredLanguage] = useState(() => {
        return localStorage.getItem('jovens_pref_lang') || 'pt';
    });

    useEffect(() => {
        if (!user) return;

        const fetchUserPreference = async () => {
            try {
                const docRef = doc(db, 'userSettings', user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().language) {
                    const lang = docSnap.data().language;
                    setPreferredLanguage(lang);
                    localStorage.setItem('jovens_pref_lang', lang);
                }
            } catch (error) {
                console.warn('Firebase pref fetch failed, using local.');
            }
        };

        fetchUserPreference();
    }, [user]);

    const changeLanguage = async (newLang) => {
        setPreferredLanguage(newLang);
        localStorage.setItem('jovens_pref_lang', newLang);
        
        if (user) {
            try {
                const docRef = doc(db, 'userSettings', user.uid);
                await setDoc(docRef, { language: newLang }, { merge: true });
            } catch (error) {
                console.warn('Firebase pref save failed, saved locally instead.');
            }
        }
    };

    const languages = [
        { code: 'pt', name: 'Português' },
        { code: 'en', name: 'Inglês' },
        { code: 'es', name: 'Espanhol' },
        { code: 'fr', name: 'Francês' },
        { code: 'it', name: 'Italiano' },
        { code: 'de', name: 'Alemão' },
        { code: 'zh', name: 'Chinês (Mandarim)' },
        { code: 'ja', name: 'Japonês' },
        { code: 'ko', name: 'Coreano' },
        { code: 'hi', name: 'Hindi' },
        { code: 'ar', name: 'Árabe' },
        { code: 'ru', name: 'Russo' },
        { code: 'tr', name: 'Turco' },
        { code: 'bn', name: 'Bengali' },
        { code: 'vi', name: 'Vietnamita' },
        { code: 'nl', name: 'Holandês' },
        { code: 'pl', name: 'Polonês' },
    ];

    const value = useMemo(() => ({
        preferredLanguage,
        changeLanguage,
        languages
    }), [preferredLanguage, changeLanguage, languages]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};
