import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import AIService from '../services/aiService';
import '../styles/mentor.css';

export default function AIWritingAssistant({ text, onRefine, type = "professional" }) {
    const [loading, setLoading] = useState(false);

    const handleRefine = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!text || text.trim().length < 5 || loading) return;

        setLoading(true);
        try {
            const refined = await AIService.refineText(text, type);
            onRefine(refined);
        } catch (error) {
            console.error('Text refinement failed', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleRefine}
            disabled={loading || !text || text.trim().length < 5}
            className="ai-writer-btn"
            title="Melhorar com IA"
        >
            {loading ? (
                <Loader2 size={12} className="animate-spin text-indigo-500" />
            ) : (
                <Sparkles size={12} className="ai-writer-sparkle" />
            )}
            <span>{loading ? 'A MELHORAR...' : 'MÁGICA ✨'}</span>
        </button>
    );
}
