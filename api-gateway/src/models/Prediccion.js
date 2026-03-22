const mongoose = require('mongoose');

/**
 * Modelo Prediccion
 * Guarda cada análisis que un usuario hace sobre una licitación.
 * Es el historial del Dashboard (M4).
 */
const PrediccionSchema = new mongoose.Schema(
  {
    usuario:      { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
    // Datos de la licitación analizada
    licitacion_id:{ type: String, default: 'manual' },
    entidad:      { type: String, required: true },
    cuantia:      { type: Number, required: true },
    sector:       { type: String, required: true },
    municipio:    { type: String, default: '' },
    modalidad:    { type: String, default: '' },
    // Resultado del ML Service
    probabilidad:       { type: Number, min: 0, max: 1, required: true },
    porcentaje:         { type: Number, min: 0, max: 100 },
    factores_positivos: [{ type: String }],
    factores_negativos: [{ type: String }],
    recomendaciones:    [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Prediccion', PrediccionSchema);
