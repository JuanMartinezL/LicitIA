# API Gateway

## Descripción
Microservicio Node.js (Express) que actúa como gateway principal para el sistema. Maneja rutas de autenticación, permisos JWT, enrutamiento hacia el servicio de ML y microservicios de dominio como licitaciones, perfil, predicción, asistente.

## Estructura
- `src/server.js`: punto de entrada y configuración del servidor.
- `src/config/database.js`: configuración de conexión a base de datos (MongoDB / otro).
- `src/middleware/auth.js`: middleware para validar JWT y roles.
- `src/middleware/errorHandler.js`: manejo global de errores.
- `src/models/`: modelos de datos (`Usuario.js`, `Prediccion.js`).
- `src/modules/`: rutas y controladores organizados por funcionalidad.
- `src/routes/`: rutas específicas que agregan módulos al router.
- `src/services/`: lógica de negocio y orquestación.
- `src/utils/mlClient.js`: cliente HTTP hacia `ml-service`.

## Instalación
```bash
cd api-gateway
npm install
```

## Ejecución
```bash
npm start
```

## Variables de entorno (ejemplo)
- `PORT=3000`
- `DB_URI=mongodb://localhost:27017/licitia`
- `JWT_SECRET=secret`
- `ML_SERVICE_URL=http://localhost:8000`

## Endpoints principales
- `POST /auth/login`
- `POST /auth/register`
- `GET /licitaciones`
- `POST /prediccion`
- `GET /perfil`
- `POST /asistente`

## Consideraciones
- Registrar errores en middleware.
- Implementar trazabilidad y métricas.
- Proteger rutas con `auth`.
- Usar Swagger o OpenAPI para documentación de API (opcional).
