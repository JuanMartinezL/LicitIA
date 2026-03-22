const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

/**
 * Middleware de autenticación
 * Verifica el JWT en el header Authorization de cada petición.
 * Si es válido → adjunta req.usuario y llama next()
 * Si es inválido → responde 401/403 sin continuar
 */
const verificarToken = async (req, res, next) => {
  try {
    // 1. Extraer el token del header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        ok: false,
        error: 'Acceso denegado — se requiere token de autenticación',
      });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verificar y decodificar el token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const mensaje = err.name === 'TokenExpiredError'
        ? 'La sesión ha expirado — inicia sesión nuevamente'
        : 'Token inválido';
      return res.status(403).json({ ok: false, error: mensaje });
    }

    // 3. Verificar que el usuario aún existe en la base de datos
    const usuario = await Usuario.findById(decoded.id).select('-password');
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ ok: false, error: 'Usuario no encontrado o inactivo' });
    }

    // 4. Adjuntar datos del usuario al request para uso en controllers
    req.usuario = {
      id:      usuario._id.toString(),
      email:   usuario.email,
      nit:     usuario.nit,
      empresa: usuario.empresa,
      nombre:  usuario.nombre,
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { verificarToken };
