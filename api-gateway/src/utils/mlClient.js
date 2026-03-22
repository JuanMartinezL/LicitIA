/**
 * Cliente del MS2 — ML Service
 * El MS1 usa este módulo para comunicarse con el microservicio de predicción.
 * Solo el MS1 llama al MS2 — el frontend nunca lo toca directamente.
 */
const axios = require('axios');

const ms2Client = axios.create({
  baseURL: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Llama al endpoint POST /predict del MS2
 * @param {Object} datos - { entidad, cuantia, sector, municipio, modalidad, nit }
 * @returns {Object} - { probabilidad, porcentaje, factores_positivos, factores_negativos, recomendaciones }
 */
const predecir = async (datos) => {
  try {
    const { data } = await ms2Client.post('/predict', datos);
    return data;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      const err = new Error('El servicio de predicción (MS2) no está disponible. Verifica que esté corriendo en :8000');
      err.status = 503;
      throw err;
    }
    if (error.code === 'ECONNABORTED') {
      const err = new Error('El servicio de predicción tardó demasiado. Intenta nuevamente.');
      err.status = 504;
      throw err;
    }
    throw error;
  }
};

/**
 * Verifica que el MS2 esté vivo
 * @returns {boolean}
 */
const verificarSalud = async () => {
  try {
    const { data } = await ms2Client.get('/health', { timeout: 5000 });
    return data.status === 'ok';
  } catch {
    return false;
  }
};

module.exports = { predecir, verificarSalud };
