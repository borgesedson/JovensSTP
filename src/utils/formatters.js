/**
 * Utility functions para formatar dados do perfil
 */

/**
 * Formata objeto de educação para string legível
 * @param {Object|String} education - Objeto ou string de educação
 * @returns {String} Educação formatada
 */
export const formatEducation = (education) => {
  if (!education) return '';
  
  // Se já é string, retorna direto
  if (typeof education === 'string') return education;
  
  // Se é objeto, formata
  if (typeof education === 'object') {
    const { degree, institution, startYear, endYear, current } = education;
    
    let formatted = '';
    
    if (degree) {
      formatted += degree;
    }
    
    if (institution) {
      formatted += (formatted ? ' - ' : '') + institution;
    }
    
    if (startYear) {
      const yearRange = current 
        ? `(${startYear} - Presente)` 
        : endYear 
          ? `(${startYear} - ${endYear})`
          : `(${startYear})`;
      formatted += ' ' + yearRange;
    }
    
    return formatted.trim();
  }
  
  return '';
};

/**
 * Formata objeto de experiência para string legível
 * @param {Object|String} experience - Objeto ou string de experiência
 * @returns {String} Experiência formatada
 */
export const formatExperience = (experience) => {
  if (!experience) return '';
  
  if (typeof experience === 'string') return experience;
  
  if (typeof experience === 'object') {
    const { title, company, startDate, endDate, current } = experience;
    
    let formatted = '';
    
    if (title) {
      formatted += title;
    }
    
    if (company) {
      formatted += (formatted ? ' @ ' : '') + company;
    }
    
    if (startDate) {
      const dateRange = current 
        ? `(${startDate} - Presente)` 
        : endDate 
          ? `(${startDate} - ${endDate})`
          : `(${startDate})`;
      formatted += ' ' + dateRange;
    }
    
    return formatted.trim();
  }
  
  return '';
};

/**
 * Formata lista de skills para exibição
 * @param {Array|String} skills - Array ou string de skills
 * @returns {Array} Array de skills
 */
export const formatSkills = (skills) => {
  if (!skills) return [];
  
  if (Array.isArray(skills)) return skills;
  
  if (typeof skills === 'string') {
    return skills.split(',').map(s => s.trim()).filter(Boolean);
  }
  
  return [];
};

/**
 * Garante que um valor seja um array
 * @param {*} value - Valor para converter
 * @returns {Array}
 */
export const ensureArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};

/**
 * Verifica se um valor é um objeto válido (não null, não array)
 * @param {*} value - Valor para verificar
 * @returns {Boolean}
 */
export const isPlainObject = (value) => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};
