const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const Usuario  = require('../../models/Usuario');


// Helpers

const generarToken = (usuario) =>
  jwt.sign(
    {
      id:      usuario._id.toString(),
      email:   usuario.email,
      nit:     usuario.nit,
      empresa: usuario.empresa,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const respuestaUsuario = (usuario) => ({
  id:      usuario._id,
  nombre:  usuario.nombre,
  email:   usuario.email,
  nit:     usuario.nit,
  empresa: usuario.empresa,
  sector:  usuario.sector,
});


// POST /api/auth/register
// Registra una nueva empresa en LicitIA

const register = async (req, res, next) => {
  try {
    const { nombre, email, password, nit, empresa, sector } = req.body;

    // Validación básica de campos requeridos
    if (!nombre || !email || !password || !nit || !empresa) {
      return res.status(400).json({
        ok: false,
        error: 'Campos requeridos: nombre, email, password, nit, empresa',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ ok: false, error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Verificar que el email no esté registrado
    const emailExiste = await Usuario.findOne({ email: email.toLowerCase() });
    if (emailExiste) {
      return res.status(400).json({ ok: false, error: 'Este correo ya está registrado' });
    }

    // Hashear la contraseña (12 rondas = buen balance seguridad/velocidad)
    const passwordHash = await bcrypt.hash(password, 12);

    // Crear el usuario
    const usuario = await Usuario.create({
      nombre:   nombre.trim(),
      email:    email.toLowerCase().trim(),
      password: passwordHash,
      nit:      nit.trim(),
      empresa:  empresa.trim(),
      sector:   sector?.trim() || '',
    });

    // Generar JWT
    const token = generarToken(usuario);

    console.log(` Usuario registrado: ${usuario.email} | Empresa: ${usuario.empresa}`);

    res.status(201).json({
      ok:      true,
      mensaje: `Bienvenido a LicitIA, ${usuario.nombre}`,
      token,
      usuario: respuestaUsuario(usuario),
    });

  } catch (error) {
    next(error);
  }
};


// POST /api/auth/login
// Inicia sesión y devuelve un nuevo JWT

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email y contraseña son requeridos' });
    }

    // Buscar el usuario (incluir password para la comparación)
    const usuario = await Usuario.findOne({ email: email.toLowerCase() }).select('+password');
    if (!usuario) {
      // Mensaje genérico para no revelar qué campo es incorrecto
      return res.status(401).json({ ok: false, error: 'Credenciales incorrectas' });
    }

    // Verificar que la cuenta esté activa
    if (!usuario.activo) {
      return res.status(401).json({ ok: false, error: 'Cuenta desactivada. Contacta al soporte.' });
    }

    // Comparar contraseña con el hash guardado
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({ ok: false, error: 'Credenciales incorrectas' });
    }

    // Generar nuevo JWT
    const token = generarToken(usuario);

    console.log(` Login exitoso: ${usuario.email}`);

    res.json({
      ok:      true,
      mensaje: `Sesión iniciada — bienvenido ${usuario.nombre}`,
      token,
      usuario: respuestaUsuario(usuario),
    });

  } catch (error) {
    next(error);
  }
};


// GET /api/auth/me
// Devuelve los datos del usuario autenticado (requiere JWT)

const me = async (req, res, next) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id);
    if (!usuario) {
      return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
    }
    res.json({ ok: true, usuario: respuestaUsuario(usuario) });
  } catch (error) {
    next(error);
  }
};


// PUT /api/auth/perfil
// Actualiza datos básicos del perfil (sin cambiar contraseña)

const actualizarPerfil = async (req, res, next) => {
  try {
    const { nombre, empresa, sector } = req.body;
    const campos = {};
    if (nombre)  campos.nombre  = nombre.trim();
    if (empresa) campos.empresa = empresa.trim();
    if (sector)  campos.sector  = sector.trim();

    const usuario = await Usuario.findByIdAndUpdate(
      req.usuario.id,
      campos,
      { new: true, runValidators: true }
    );

    res.json({ ok: true, mensaje: 'Perfil actualizado', usuario: respuestaUsuario(usuario) });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, me, actualizarPerfil };
