require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');
const conectarDB  = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { verificarSalud } = require('./utils/mlClient');

const app = express();

// Coneccion a la base de datos

connectDB();


// Middlewares globales — se aplican a todas las rutas

// CORS — solo acepta peticiones del frontend
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Parseo de JSON — límite de 10mb para permitir pliegos largos en el Asistente IA
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logger de peticiones HTTP (solo en desarrollo)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Rate limiting — protege contra abuso y ataques de fuerza bruta
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max:      200,              // máximo 200 peticiones por IP en 15 min
  message:  { ok: false, error: 'Demasiadas peticiones. Intenta en 15 minutos.' },
});
app.use(limiter);

// Rate limiting más estricto para el login (anti fuerza bruta)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { ok: false, error: 'Demasiados intentos de ingreso. Espera 15 minutos.' },
});

// RUtas — cada módulo agrupa sus propias rutas

app.use('/api/auth',          loginLimiter, require('./modules/auth/auth.routes'));
app.use('/api/licitaciones',               require('./modules/licitaciones/licitaciones.routes'));
app.use('/api/prediccion',                 require('./modules/prediccion/prediccion.routes'));
app.use('/api/perfil',                     require('./modules/perfil/perfil.routes'));
app.use('/api/asistente',                  require('./modules/asistente/asistente.routes'));


// Health Check — verifica el estado de todos los servicios

app.get('/health', async (req, res) => {
  const ms2Vivo = await verificarSalud();
  res.json({
    ok:        true,
    servicio:  'ms1-api-gateway',
    version:   '1.0.0',
    timestamp: new Date().toISOString(),
    servicios: {
      ms1_api_gateway: 'ok',
      ms2_ml_service:  ms2Vivo ? 'ok' : 'no disponible',
      mongodb:         'ok',
    },
  });
});

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ ok: false, error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// Manejo global de errores

app.use(errorHandler);


// Iniciar el servidor

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('');
  console.log(' ═══════════════════════════════════════');
  console.log(`   LicitIA — MS1 API Gateway`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log('════════════════════════════════════════ ');
  console.log('');
});

module.exports = app;
