const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conexion = await mongoose.connect(process.env.MONGODB_URI);
    console.log(` conectado: ${conexion.connection.host}`);
  } catch (error) {
    console.error(' Error de conexion en MongoDB:', error.message);
    process.exit(1);
  }
};

// Eventos de conexión
mongoose.connection.on('disconnected', () =>
  console.warn('  MongoDB desconectado')
);
mongoose.connection.on('reconnected', () =>
  console.log(' MongoDB reconectado')
);

module.exports = connectDB;
