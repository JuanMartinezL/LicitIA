const mongoose = require('mongoose');

/**
 * Modelo Usuario
 * Representa una empresa registrada en LicitIA.
 * El NIT es la clave que conecta al usuario con su historial en SECOP II.
 */
const UsuarioSchema = new mongoose.Schema(
  {
    nombre:  { type: String, required: [true, 'El nombre es obligatorio'], trim: true },
    email:   { type: String, required: [true, 'El email es obligatorio'],  unique: true, lowercase: true, trim: true },
    password:{ type: String, required: [true, 'La contraseña es obligatoria'], minlength: 6 },
    nit:     { type: String, required: [true, 'El NIT es obligatorio'], trim: true },
    empresa: { type: String, required: [true, 'El nombre de empresa es obligatorio'], trim: true },
    sector:  { type: String, trim: true, default: '' },
    activo:  { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      // Nunca exponer el password en respuestas JSON
      transform: (doc, ret) => { delete ret.password; return ret; }
    }
  }
);

module.exports = mongoose.model('Usuario', UsuarioSchema);
