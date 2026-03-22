from fastapi import APIRouter
from pathlib import Path
from datetime import datetime

router = APIRouter()
MODEL_PATH = Path("models/random_forest.pkl")

@router.get("/health")
def health():
    return {
        "status":        "ok",
        "servicio":      "ms2-ml-service",
        "version":       "1.0.0",
        "modelo_cargado": MODEL_PATH.exists(),
        "modo":          "real" if MODEL_PATH.exists() else "mock (desarrollo)",
        "timestamp":     datetime.now().isoformat(),
    }
