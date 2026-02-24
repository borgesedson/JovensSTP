/**
 * Security Utils - Guardian
 * Filtra conteúdos ilícitos ou não educacionais.
 */

const FORBIDDEN_KEYWORDS = [
    'porn', 'sexo', 'xxx', 'casino', 'aposta', 'bet', 'ganhar dinheiro rapido',
    'arma', 'droga', 'ilegal', 'hack', 'crack', 'puro', 'dating', 'encontro',
    'esquema', 'piramide', 'investimento garantido', 'vender orgaos', 'assalto',
    'roubo', 'matar', 'suicidio', 'sangue', 'violencia', 'terrorismo'
];

export const Guardian = {
    /**
     * Verifica se o texto contém palavras proibidas.
     * @param {string} text 
     * @returns {Object} { clean: boolean, found: string[] }
     */
    validateText: (text) => {
        if (!text) return { clean: true, found: [] };
        const found = FORBIDDEN_KEYWORDS.filter(word =>
            text.toLowerCase().includes(word.toLowerCase())
        );
        return {
            clean: found.length === 0,
            found
        };
    },

    /**
     * Verifica se um link parece suspeito.
     * @param {string} url 
     * @returns {boolean}
     */
    validateUrl: (url) => {
        if (!url) return true;
        const suspiciousPatterns = [/bet/i, /casino/i, /porn/i, /xxx/i, /aposta/i];
        return !suspiciousPatterns.some(pattern => pattern.test(url));
    }
};
