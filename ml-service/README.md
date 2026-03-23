# ML Service

## Descripción
Microservicio Python (FastAPI) encargado de preprocesar y predecir demandas de licitaciones. Expone endpoints de salud y predicción que consume el `api-gateway`.

## Estructura
- `app/main.py`: aplicación FastAPI y registro de routers.
- `app/routers/health.py`: endpoint de salud (`GET /health`).
- `app/routers/prediccion.py`: endpoint principal de predicción (`POST /prediccion`).
- `app/schemas/prediccion_schema.py`: esquemas Pydantic para request/response.
- `app/services/feature_engineer.py`: transformación de características.
- `app/services/predictor.py`: carga y uso del modelo entrenado.
- `models/`: modelo(s) exportados (sugerido `.pkl`, `.joblib`).

## Instalación
```bash
cd ml-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## Ejecución
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Ejemplo de request
```bash
curl -X POST http://localhost:8000/prediccion -H "Content-Type: application/json" -d '{"campo1": "valor", "campo2": 123}'
```

## Consideraciones
- Mantener sincronizados los esquemas entre `api-gateway` y `ml-service`.
- Añadir validación de payload y manejo de excepciones.
- Incluir tests unitarios para `feature_engineer` y `predictor`.
