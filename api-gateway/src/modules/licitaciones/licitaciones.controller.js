const axios = require('axios');

const SECOP_URL = 'https://www.datos.gov.co/resource/jbjy-vk9h.json';

// Timeout para llamadas al SECOP II
const secopClient = axios.create({ timeout: 15000 });


// GET /api/licitaciones
// Consulta contratos activos del SECOP II con filtros opcionales

const getAll = async (req, res, next) => {
  try {
    const {
      sector, municipio, departamento,
      cuantia_min, cuantia_max,
      limit  = 20,
      offset = 0,
    } = req.query;

    // Construir filtro SoQL (lenguaje de consulta de datos.gov.co)
    const condiciones = ["estado_contrato='Activo'"];
    if (sector)       condiciones.push(`tipo_de_contrato='${sector.toUpperCase()}'`);
    if (municipio)    condiciones.push(`ciudad_entidad='${municipio.toUpperCase()}'`);
    if (departamento) condiciones.push(`departamento_entidad='${departamento.toUpperCase()}'`);
    if (cuantia_min)  condiciones.push(`cuantia_contrato>=${cuantia_min}`);
    if (cuantia_max)  condiciones.push(`cuantia_contrato<=${cuantia_max}`);

    const { data } = await secopClient.get(SECOP_URL, {
      params: {
        $limit:  Math.min(parseInt(limit), 50),
        $offset: parseInt(offset),
        $where:  condiciones.join(' AND '),
        $select: [
          'id_contrato', 'nombre_entidad', 'nit_entidad',
          'departamento_entidad', 'ciudad_entidad',
          'tipo_de_contrato', 'modalidad_de_contratacion',
          'cuantia_contrato', 'descripcion_del_proceso',
          'fecha_de_firma', 'plazo_de_ejecucion',
        ].join(','),
        $order: 'fecha_de_firma DESC',
      },
    });

    res.json({
      ok:           true,
      total:        data.length,
      licitaciones: data,
    });
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ ok: false, error: 'El SECOP II tardó demasiado. Intenta nuevamente.' });
    }
    next(error);
  }
};


// GET /api/licitaciones/:id
// Obtiene el detalle de un contrato específico por su ID

const getById = async (req, res, next) => {
  try {
    const { data } = await secopClient.get(SECOP_URL, {
      params: {
        $where: `id_contrato='${req.params.id}'`,
        $limit: 1,
      },
    });

    if (!data.length) {
      return res.status(404).json({ ok: false, error: 'Licitación no encontrada en el SECOP II' });
    }

    res.json({ ok: true, licitacion: data[0] });
  } catch (error) {
    next(error);
  }
};


// GET /api/licitaciones/sectores
// Lista los sectores disponibles (para poblar selects en el frontend)

const getSectores = async (req, res, next) => {
  try {
    const { data } = await secopClient.get(SECOP_URL, {
      params: {
        $select: 'tipo_de_contrato',
        $group:  'tipo_de_contrato',
        $limit:  100,
        $where:  "tipo_de_contrato IS NOT NULL",
      },
    });

    const sectores = [...new Set(data.map(d => d.tipo_de_contrato).filter(Boolean))].sort();
    res.json({ ok: true, sectores });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, getSectores };
