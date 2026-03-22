/**
 * Middleware global de manejo de errores
 * Captura cualquier error que llegue con next(error) desde los controllers.
 * Devuelve respuestas JSON consistentes sin exponer stack traces en producción.
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path} →`, err.message);

  // Error de validación de Mongoose (campo requerido, tipo incorrecto, etc.)
  if (err.name === 'ValidationError') {
    const mensajes = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ ok: false, error: mensajes.join('. ') });
  }

  // Error de índice único (email o NIT duplicado)
  if (err.code === 11000) {
    const campo = Object.keys(err.keyValue)[0];
    return res.status(400).json({ ok: false, error: `El ${campo} ya está registrado` });
  }

  // Error de casteo de ID de Mongoose
  if (err.name === 'CastError') {
    return res.status(400).json({ ok: false, error: 'ID inválido' });
  }

  const status = err.status || 500;
  const mensaje = process.env.NODE_ENV === 'production' && status === 500
    ? 'Error interno del servidor'
    : err.message;

  res.status(status).json({
    ok: false,
    error: mensaje,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
