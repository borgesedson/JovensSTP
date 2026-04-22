const VPS_API_URL = import.meta.env.VITE_VPS_API_URL || 'http://YOUR_VPS_IP:5000';
const VPS_API_KEY = import.meta.env.VITE_VPS_API_KEY || 'jovens-stp-secret-key-2024';

const VPSService = {
    /**
     * Transcribes audio using Whisper on the VPS.
     * @param {Blob} audioBlob - The recorded audio blob.
     * @returns {Promise<{text: string}>}
     */
    async transcribe(audioBlob) {
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');

        const response = await fetch(`${VPS_API_URL}/transcribe`, {
            method: 'POST',
            headers: {
                'X-API-KEY': VPS_API_KEY
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Falha na transcrição do áudio');
        }

        return response.json();
    },

    /**
     * Translates text using ArgosTranslate on the VPS.
     * @param {string} text - The text to translate.
     * @param {string} to - The target language code (e.g., 'en', 'pt').
     * @param {string} from - The source language code (optional).
     * @returns {Promise<{translatedText: string}>}
     */
    async translate(text, to, from = 'auto') {
        const response = await fetch(`${VPS_API_URL}/translate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': VPS_API_KEY
            },
            body: JSON.stringify({ text, to, from }),
        });

        if (!response.ok) {
            throw new Error('Falha na tradução');
        }

        return response.json();
    }
};

export default VPSService;
