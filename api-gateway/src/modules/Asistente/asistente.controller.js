const axios = require('axios');

const CLAUDE_URL   = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

const claudeHeaders = () => ({
  'x-api-key':         process.env.CLAUDE_API_KEY,
  'anthropic-version': '2023-06-01',
  'Content-Type':      'application/json',
});

const llamarClaude = async (sistema, mensajes, maxTokens = 1000) => {
  if (!process.env.CLAUDE_API_KEY || process.env.CLAUDE_API_KEY.includes('TU_KEY')) {
    throw Object.assign(new Error('CLAUDE_API_KEY no configurada en el .env'), { status: 503 });
  }
  const { data } = await axios.post(
    CLAUDE_URL,
    { model: CLAUDE_MODEL, max_tokens: maxTokens, system: sistema, messages: mensajes },
    { headers: claudeHeaders(), timeout: 60000 }
  );
  return data.content[0].text;
};

// ─────────────────────────────────────────────────────────────
// POST /api/asistente/analizar
// Analiza un pliego de condiciones y genera checklist + orientación
// ─────────────────────────────────────────────────────────────
const analizar = async (req, res, next) => {
  try {
    const { pliego, perfil_empresa } = req.body;
    if (!pliego || pliego.trim().length < 50) {
      return res.status(400).json({ ok: false, error: 'El texto del pliego debe tener al menos 50 caracteres' });
    }

    const sistema = `Eres un experto en contratación pública colombiana y en los procesos del SECOP II.
Analizas pliegos de condiciones y ayudas a empresas colombianas a preparar mejores propuestas.
Responde siempre en español. Sé concreto, práctico y usa listas numeradas.
No inventes requisitos — solo extrae lo que está en el texto del pliego.`;

    const prompt = `Analiza este pliego de condiciones para la empresa con el siguiente perfil:

PERFIL DE LA EMPRESA:
${JSON.stringify(perfil_empresa || { empresa: req.usuario.empresa, nit: req.usuario.nit }, null, 2)}

PLIEGO DE CONDICIONES:
${pliego.substring(0, 8000)}

Entrega exactamente en este formato:

## 1. CHECKLIST DE DOCUMENTOS REQUERIDOS
(lista numerada de documentos que la empresa debe presentar)

## 2. REQUISITOS HABILITANTES CRÍTICOS
(experiencia mínima, capacidad financiera, certificaciones, etc.)

## 3. ANÁLISIS DE COMPATIBILIDAD
(¿la empresa cumple el perfil? ¿qué le falta?)

## 4. RECOMENDACIONES ESTRATÉGICAS
(3 acciones concretas para mejorar la propuesta)`;

    const resultado = await llamarClaude(sistema, [{ role: 'user', content: prompt }], 1500);
    res.json({ ok: true, resultado });
  } catch (error) {
    next(error);
  }
};


// POST /api/asistente/chat
// Chat conversacional sobre licitaciones con contexto de la empresa

const chat = async (req, res, next) => {
  try {
    const { mensaje, historial = [], contexto_empresa } = req.body;
    if (!mensaje || mensaje.trim().length === 0) {
      return res.status(400).json({ ok: false, error: 'El mensaje no puede estar vacío' });
    }

    const empresa = contexto_empresa || { empresa: req.usuario.empresa, nit: req.usuario.nit };

    const sistema = `Eres LicitaIA, asistente experto en licitaciones públicas colombianas del SECOP II.
Ayudas a empresas a entender procesos de contratación, requisitos legales y estrategias para ganar licitaciones.
Contexto de la empresa: ${JSON.stringify(empresa)}
Responde en español, de forma clara y concisa (máximo 3 párrafos).
Si no sabes algo con certeza, dilo claramente en lugar de inventar.`;

    // Limitar historial a las últimas 10 interacciones para no exceder tokens
    const historialLimitado = historial.slice(-10);
    const respuesta = await llamarClaude(
      sistema,
      [...historialLimitado, { role: 'user', content: mensaje }],
      800
    );

    res.json({ ok: true, respuesta });
  } catch (error) {
    next(error);
  }
};

module.exports = { analizar, chat };
