// Configuração via variáveis de ambiente (.env)
const VPS_URL = process.env.VPS_URL || 'http://localhost:5001';
const API_KEY = process.env.VPS_KEY || 'jovens-stp-secret-key-2024';

export const vpsQuery = async (sql: string, params: any[] = []) => {
  try {
    const response = await fetch(`${VPS_URL}/db/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': API_KEY
      },
      body: JSON.stringify({ sql, params })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro na Bridge da VPS');
    }

    return await response.json();
  } catch (error: any) {
    console.error('❌ VPS Bridge Error:', error.message);
    throw error;
  }
};
