const router = require('express').Router();
const { getAll, getById, getSectores } = require('./licitaciones.controller');
const { verificarToken } = require('../../middleware/auth');

// Todas las rutas de licitaciones requieren JWT
router.use(verificarToken);

router.get('/',           getAll);       // GET /api/licitaciones?sector=&municipio=
router.get('/sectores',   getSectores);  // GET /api/licitaciones/sectores
router.get('/:id',        getById);      // GET /api/licitaciones/:id

module.exports = router;
