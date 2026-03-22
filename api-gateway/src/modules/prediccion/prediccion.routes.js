const router = require('express').Router();
const { analizar, getMias, getById } = require('./prediccion.controller');
const { verificarToken } = require('../../middleware/auth');

router.use(verificarToken);

router.post('/',        analizar);   // POST /api/prediccion — analizar licitación
router.get('/mias',     getMias);    // GET  /api/prediccion/mias — mi historial
router.get('/:id',      getById);    // GET  /api/prediccion/:id — detalle

module.exports = router;
