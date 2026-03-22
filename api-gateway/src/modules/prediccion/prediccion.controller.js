const { predecir } = require('../../utils/mlClient');
const Prediccion   = require('../../models/Prediccion');

//
// POST /api/prediccion
// Analiza una licitación:
//   1. Valida los datos recibidos
//   2. Llama al MS2 para obtener la predicción
//   3. Guarda el resultado en MongoDB
//   4. Devuelve el resultado al frontend
// 
const analizar = async (req, res, next) => {
  try {
    const { licitacion_id, entidad, cuantia, sector, municipio, modalidad } = req.body;

    // Validación de campos requeridos
    if (!entidad || !cuantia || !sector) {
      return res.status(400).json({
        ok:    false,
        error: 'Campos requeridos: entidad, cuantia, sector',
      });
    }

    const cuantiaNum = parseFloat(cuantia);
    if (isNaN(cuantiaNum) || cuantiaNum <= 0) {
      return res.status(400).json({ ok: false, error: 'La cuantía debe ser un número positivo' });
    }

    // Llamada al MS2 
    const datosPredicion = {
      entidad,
      cuantia:   cuantiaNum,
      sector,
      municipio: municipio || '',
      modalidad: modalidad || '',
      nit:       req.usuario.nit,   // viene del JWT verificado
    };

    console.log(`🔮 Predicción solicitada por ${req.usuario.empresa} | ${entidad} | $${cuantiaNum.toLocaleString()}`);

    const resultado = await predecir(datosPredicion);

    // Guardar en MongoDB 
    const prediccion = await Prediccion.create({
      usuario:            req.usuario.id,
      licitacion_id:      licitacion_id || 'manual',
      entidad,
      cuantia:            cuantiaNum,
      sector,
      municipio:          municipio || '',
      modalidad:          modalidad || '',
      probabilidad:       resultado.probabilidad,
      porcentaje:         resultado.porcentaje,
      factores_positivos: resultado.factores_positivos || [],
      factores_negativos: resultado.factores_negativos || [],
      recomendaciones:    resultado.recomendaciones    || [],
    });

    //Respuesta al frontend 
    res.status(201).json({
      ok:            true,
      prediccion_id: prediccion._id,
      ...resultado,
    });

  } catch (error) {
    next(error);
  }
};


// GET /api/prediccion/mias
// Devuelve el historial de predicciones del usuario autenticado

const getMias = async (req, res, next) => {
  try {
    const predicciones = await Prediccion
      .find({ usuario: req.usuario.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ ok: true, total: predicciones.length, predicciones });
  } catch (error) {
    next(error);
  }
};


// GET /api/prediccion/:id
// Devuelve el detalle de una predicción específica

const getById = async (req, res, next) => {
  try {
    const prediccion = await Prediccion.findOne({
      _id:     req.params.id,
      usuario: req.usuario.id,   // Solo puede ver las suyas
    }).lean();

    if (!prediccion) {
      return res.status(404).json({ ok: false, error: 'Predicción no encontrada' });
    }

    res.json({ ok: true, prediccion });
  } catch (error) {
    next(error);
  }
};

module.exports = { analizar, getMias, getById };
