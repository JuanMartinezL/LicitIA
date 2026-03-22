const axios = require('axios');

const SECOP_URL = 'https://www.datos.gov.co/resource/jbjy-vk9h.json';
const secopClient = axios.create({ timeout: 20000 });


// GET /api/perfil/:nit
// Construye el perfil competitivo de una empresa cruzando su NIT
// contra el histórico completo del SECOP II
const getByNit = async (req, res, next) => {
  try {
    const { nit } = req.params;

    if (!nit || nit.trim().length < 5) {
      return res.status(400).json({ ok: false, error: 'NIT inválido' });
    }

    const { data } = await secopClient.get(SECOP_URL, {
      params: {
        $where:  `nit_entidad='${nit.trim()}'`,
        $limit:  500,
        $select: [
          'id_contrato', 'nombre_entidad', 'nit_entidad',
          'cuantia_contrato', 'tipo_de_contrato',
          'ciudad_entidad', 'departamento_entidad',
          'estado_contrato', 'fecha_de_firma',
          'proveedor_seleccionado', 'modalidad_de_contratacion',
        ].join(','),
        $order: 'fecha_de_firma DESC',
      },
    });

    if (!data.length) {
      return res.status(404).json({
        ok:    false,
        error: `No se encontró historial para el NIT ${nit} en el SECOP II`,
      });
    }

    //  Cálculo de estadísticas 
    const total    = data.length;
    const ganados  = data.filter(c => c.estado_contrato === 'Liquidado').length;
    const activos  = data.filter(c => c.estado_contrato === 'Activo').length;

    const cuantias = data
      .map(c => parseFloat(c.cuantia_contrato))
      .filter(n => !isNaN(n) && n > 0);

    const cuantia_total   = cuantias.reduce((a, b) => a + b, 0);
    const cuantia_promedio = cuantias.length ? cuantia_total / cuantias.length : 0;
    const cuantia_maxima  = cuantias.length ? Math.max(...cuantias) : 0;

    // Sectores más frecuentes
    const conteoSectores = {};
    data.forEach(c => {
      if (c.tipo_de_contrato) {
        conteoSectores[c.tipo_de_contrato] = (conteoSectores[c.tipo_de_contrato] || 0) + 1;
      }
    });
    const sectores_activos = Object.entries(conteoSectores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([sector, cantidad]) => ({ sector, cantidad }));

    // Ciudades más frecuentes
    const conteoCiudades = {};
    data.forEach(c => {
      if (c.ciudad_entidad) {
        conteoCiudades[c.ciudad_entidad] = (conteoCiudades[c.ciudad_entidad] || 0) + 1;
      }
    });
    const ciudades_activas = Object.entries(conteoCiudades)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ciudad, cantidad]) => ({ ciudad, cantidad }));

    // Entidades más frecuentes
    const conteoEntidades = {};
    data.forEach(c => {
      if (c.nombre_entidad) {
        conteoEntidades[c.nombre_entidad] = (conteoEntidades[c.nombre_entidad] || 0) + 1;
      }
    });
    const entidades_frecuentes = Object.entries(conteoEntidades)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([entidad, contratos]) => ({ entidad, contratos }));

    res.json({
      ok: true,
      perfil: {
        nit,
        resumen: {
          total_contratos:   total,
          contratos_ganados: ganados,
          contratos_activos: activos,
          tasa_exito:        total > 0 ? Math.round((ganados / total) * 100) : 0,
          cuantia_total:     Math.round(cuantia_total),
          cuantia_promedio:  Math.round(cuantia_promedio),
          cuantia_maxima:    Math.round(cuantia_maxima),
        },
        sectores_activos,
        ciudades_activas,
        entidades_frecuentes,
        ultimos_contratos: data.slice(0, 20),
      },
    });

  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ ok: false, error: 'El SECOP II tardó demasiado. Intenta nuevamente.' });
    }
    next(error);
  }
};

module.exports = { getByNit };
