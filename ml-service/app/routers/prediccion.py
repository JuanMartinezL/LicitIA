from fastapi import APIRouter
from app.schemas.prediccion_schema import LicitacionInput, PrediccionOutput
from app.services.predictor import predecir

router = APIRouter()

@router.post("", response_model=PrediccionOutput)
def endpoint_predecir(datos: LicitacionInput):
    """
    Predice la probabilidad de éxito de una empresa en una licitación.

    Recibe los datos de la licitación desde el MS1 (API Gateway)
    y devuelve la probabilidad + factores + recomendaciones.

    - Usa el modelo Random Forest real si está entrenado (models/random_forest.pkl)
    - Usa predicción de desarrollo (mock) si el modelo aún no existe
    """
    return predecir(datos)
