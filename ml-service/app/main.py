from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import prediccion, health
from app.services.predictor import cargar_modelo
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(
    title="LicitIA — MS2 ML Service",
    description="Microservicio de predicción de probabilidad de éxito en licitaciones públicas colombianas",
    version="1.0.0",
    docs_url="/docs",      # Swagger UI en http://localhost:8000/docs
    redoc_url="/redoc",
)

# Solo acepta llamadas desde el MS1 (esto para comunicación interna)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

# Registrar routers
app.include_router(health.router,     tags=["health"])
app.include_router(prediccion.router, prefix="/predict", tags=["prediccion"])

@app.on_event("startup")
async def startup():
    """Al iniciar, intenta cargar el modelo en memoria."""
    print("")
    print("═══════════════════════════════════════")
    print("   LicitIA — MS2 ML Service")
    print("   http://localhost:8000")
    print("   Docs: http://localhost:8000/docs")
    print("════════════════════════════════════════ ")
    print("")

    modelo = cargar_modelo()
    if modelo:
        print("Modelo Random Forest cargado y listo")
    else:
        print("  Modelo no encontrado — usando predicción de desarrollo")
        print("   Ejecuta: python data/secop_loader.py → python data/cleaner.py")
        print("   Luego abre notebooks/02_entrenamiento.ipynb para entrenar el modelo")
