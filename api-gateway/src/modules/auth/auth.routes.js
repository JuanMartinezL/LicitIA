const router = require('express').Router();
const { register, login, me, actualizarPerfil } = require('./auth.controller');
const { verificarToken } = require('../../middleware/auth');

// Rutas públicas (sin JWT) 
router.post('/register', register);   // Crear cuenta
router.post('/login',    login);      // Iniciar sesión

// Rutas privadas (requieren JWT) 
router.get('/me',              verificarToken, me);               // Ver mi perfil
router.put('/perfil',          verificarToken, actualizarPerfil); // Actualizar perfil

module.exports = router;
