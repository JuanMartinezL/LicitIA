const router = require('express').Router();
const { analizar, chat } = require('./asistente.controller');
const { verificarToken } = require('../../middleware/auth');

router.use(verificarToken);

router.post('/analizar', analizar);  // POST /api/asistente/analizar — analiza pliego
router.post('/chat',     chat);      // POST /api/asistente/chat    — conversación libre

module.exports = router;
