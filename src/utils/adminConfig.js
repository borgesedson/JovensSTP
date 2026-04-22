/**
 * Lista de emails com permissão de administrador.
 * Apenas estes emails podem promover/remover embaixadores.
 * 
 * SEGURANÇA: Esta lista é verificada TANTO no frontend (UI)
 * quanto nas regras Firestore (backend), impossibilitando
 * que qualquer utilizador se autopromova.
 */
export const ADMIN_EMAILS = [
  'borgesedson431@gmail.com',
]

/**
 * Verifica se um email é administrador da plataforma.
 */
export const isAdminEmail = (email) => {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}
