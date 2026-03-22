const router = require('express').Router();
const { getByNit } = require('./perfil.controller');
const { verificarToken } = require('../../middleware/auth');

router.use(verificarToken);

router.get('/:nit', getByNit);  // GET /api/perfil/900123456

module.exports = router;
