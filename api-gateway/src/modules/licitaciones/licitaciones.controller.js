const axios = require('axios');

const SECOP_URL = 'https://www.datos.gov.co/resource/jbjy-vk9h.json';

// Timeout para llamadas al SECOP II
const secopClient = axios.create({ timeout: 15000 });


// GET /api/licitaciones
// Consulta contratos del SECOP II con filtros opcionales

const getAll = async (req, res, next) => {
  try {
    const {
      tipo_contrato, municipio, departamento,
      valor_min, valor_max, estado,
      limit  = 20,
      offset = 0,
    } = req.query;

    // Construir filtro SoQL (lenguaje de consulta de datos.gov.co)
    const condiciones = [];
    if (tipo_contrato) condiciones.push(`tipo_de_contrato='${tipo_contrato}'`);
    if (municipio)     condiciones.push(`ciudad='${municipio.toUpperCase()}'`);
    if (departamento)  condiciones.push(`departamento='${departamento}'`);
    if (valor_min)     condiciones.push(`valor_del_contrato>=${valor_min}`);
    if (valor_max)     condiciones.push(`valor_del_contrato<=${valor_max}`);
    if (estado)        condiciones.push(`estado_contrato='${estado}'`);

    const params = {
      $limit:  Math.min(parseInt(limit), 50),
      $offset: parseInt(offset),
      $select: [
        'id_contrato', 'proceso_de_compra',
        'nombre_entidad', 'nit_entidad',
        'departamento', 'ciudad',
        'sector', 'tipo_de_contrato', 'modalidad_de_contratacion',
        'valor_del_contrato', 'estado_contrato',
        'objeto_del_contrato', 'descripcion_del_proceso',
        'fecha_de_firma', 'fecha_de_inicio_del_contrato', 'fecha_de_fin_del_contrato',
        'duraci_n_del_contrato', 'urlproceso',
        'es_pyme', 'proveedor_adjudicado',
      ].join(','),
      $order: 'fecha_de_firma DESC',
    };

    if (condiciones.length > 0) {
      params.$where = condiciones.join(' AND ');
    }

    const { data } = await secopClient.get(SECOP_URL, { params });

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
// Lista los tipos de contrato disponibles (para poblar selects en el frontend)

const getSectores = async (req, res, next) => {
  try {
    const { data } = await secopClient.get(SECOP_URL, {
      params: {
        $select: 'tipo_de_contrato',
        $group:  'tipo_de_contrato',
        $limit:  100,
        $where:  'tipo_de_contrato IS NOT NULL',
      },
    });

    const sectores = [...new Set(data.map(d => d.tipo_de_contrato).filter(Boolean))].sort();
    res.json({ ok: true, sectores });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, getSectores };