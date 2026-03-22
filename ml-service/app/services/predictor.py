"""
Servicio de predicción del MS2
Carga el modelo entrenado y genera predicciones con SHAP.
Mientras el modelo no esté entrenado, usa lógica de reglas (modo mock).
"""
import joblib
import numpy as np
from pathlib import Path
from app.schemas.prediccion_schema import LicitacionInput
from app.services.feature_engineer import (
    construir_features, nombres_features, SECTORES_COMPETIDOS
)

MODEL_PATH = Path("models/random_forest.pkl")

# Caché del modelo — se carga una vez al iniciar y se reutiliza
_modelo = None


def cargar_modelo():
    """Carga el modelo desde disco. Retorna None si no existe todavía."""
    global _modelo
    if _modelo is None and MODEL_PATH.exists():
        try:
            _modelo = joblib.load(MODEL_PATH)
            print(f" Modelo cargado: {MODEL_PATH}")
        except Exception as e:
            print(f" Error al cargar modelo: {e}")
    return _modelo


def _prediccion_con_modelo(datos: LicitacionInput, modelo) -> dict:
    """Predicción real usando el Random Forest entrenado."""
    features = construir_features(datos)
    prob     = float(modelo.predict_proba([features])[0][1])

    # Generar explicación básica de SHAP (simplificado)
    feature_names = nombres_features()
    importancias  = modelo.feature_importances_
    contrib = [(nombre, feat * imp)
               for nombre, feat, imp in zip(feature_names, features, importancias)]
    contrib_sorted = sorted(contrib, key=lambda x: abs(x[1]), reverse=True)

    factores_positivos = [n for n, v in contrib_sorted if v > 0][:3]
    factores_negativos = [n for n, v in contrib_sorted if v < 0][:3]

    return {
        "probabilidad":       round(prob, 4),
        "porcentaje":         round(prob * 100),
        "factores_positivos": _humanizar_factores(factores_positivos, "positivo"),
        "factores_negativos": _humanizar_factores(factores_negativos, "negativo"),
        "recomendaciones":    _generar_recomendaciones(datos, prob),
        "modo":               "real",
    }


def _prediccion_mock(datos: LicitacionInput) -> dict:
    """
    Predicción de desarrollo basada en reglas del dominio.
    Se usa mientras el modelo real no esté entrenado.
    """
    prob = 0.48

    sector_upper    = (datos.sector    or "").upper()
    modalidad_upper = (datos.modalidad or "").upper()

    # Ajustes por cuantía
    if 50_000_000 <= datos.cuantia <= 800_000_000:
        prob += 0.10
    elif datos.cuantia > 2_000_000_000:
        prob -= 0.12

    # Ajustes por sector
    if any(s in sector_upper for s in SECTORES_COMPETIDOS):
        prob -= 0.06

    # Ajustes por modalidad
    if "SELECCIÓN" in modalidad_upper or "MENOR" in modalidad_upper:
        prob += 0.08
    elif "LICITACIÓN PÚBLICA" in modalidad_upper:
        prob -= 0.05

    # Bonificación por historial registrado
    if datos.nit and len(datos.nit.strip()) > 5:
        prob += 0.07

    # Bonificación por conocimiento local
    if datos.municipio and datos.municipio.strip():
        prob += 0.04

    prob = max(0.05, min(0.93, prob))

    factores_positivos = []
    factores_negativos = []

    if datos.nit:
        factores_positivos.append(
            "La empresa tiene NIT registrado — se puede consultar su historial en SECOP II"
        )
    if 50_000_000 <= datos.cuantia <= 800_000_000:
        factores_positivos.append(
            "La cuantía está en el rango donde hay mayor número de proponentes calificados"
        )
    if datos.municipio:
        factores_positivos.append(
            f"Proceso en {datos.municipio.title()} — ventaja competitiva si tienes presencia local"
        )

    if datos.cuantia > 2_000_000_000:
        factores_negativos.append(
            "La cuantía muy alta exige mayores requisitos financieros y de experiencia acreditada"
        )
    if any(s in sector_upper for s in SECTORES_COMPETIDOS):
        factores_negativos.append(
            f"El sector '{datos.sector}' tiene alta competencia histórica en el SECOP II colombiano"
        )
    if "LICITACIÓN PÚBLICA" in modalidad_upper:
        factores_negativos.append(
            "La Licitación Pública es la modalidad más competida — sin límite de oferentes"
        )

    return {
        "probabilidad":       round(prob, 4),
        "porcentaje":         round(prob * 100),
        "factores_positivos": factores_positivos,
        "factores_negativos": factores_negativos,
        "recomendaciones":    _generar_recomendaciones(datos, prob),
        "modo":               "mock",
    }


def _humanizar_factores(factores: list, tipo: str) -> list:
    """Convierte nombres técnicos de features a texto entendible."""
    mapa = {
        "log_cuantia":           "La cuantía de la licitación influye significativamente",
        "cuantia_rango_medio":   "La cuantía está en el rango más competitivo del mercado",
        "cuantia_muy_alta":      "Cuantía muy alta — exige mayor experiencia acreditada",
        "sector_competido":      "El sector tiene alta competencia histórica en el SECOP II",
        "modalidad_abierta":     "La modalidad abierta permite participación sin límite de oferentes",
        "entidad_alto_volumen":  "Esta entidad tiene alto volumen histórico de contratos",
        "tiene_nit":             "Tu empresa tiene historial verificable en el SECOP II",
        "tiene_municipio":       "La localización geográfica favorece tu participación",
    }
    return [mapa.get(f, f) for f in factores if f in mapa]


def _generar_recomendaciones(datos: LicitacionInput, prob: float) -> list:
    """Genera recomendaciones estratégicas personalizadas según el resultado."""
    recomendaciones = [
        "Revisa el pliego de condiciones completo y usa el Asistente IA "
        "para identificar los requisitos habilitantes críticos",
    ]

    if prob < 0.50:
        recomendaciones.append(
            "Consulta el historial de adjudicaciones de esta entidad en el SECOP II para "
            "conocer el perfil típico del ganador y ajustar tu propuesta"
        )
        recomendaciones.append(
            "Verifica si puedes presentarte en consorcio con otra empresa para cumplir "
            "los requisitos de experiencia o capacidad financiera"
        )
    else:
        recomendaciones.append(
            "Asegúrate de que tus estados financieros del último año estén actualizados, "
            "certificados y con las cifras que exige el pliego"
        )
        recomendaciones.append(
            "Documenta y certifica toda tu experiencia previa relacionada con este tipo "
            "de contrato — es el factor diferenciador más importante en la evaluación"
        )

    return recomendaciones


def predecir(datos: LicitacionInput) -> dict:
    """
    Función principal de predicción.
    Usa el modelo real si está disponible, o el mock si no.
    """
    modelo = cargar_modelo()
    if modelo is not None:
        return _prediccion_con_modelo(datos, modelo)
    return _prediccion_mock(datos)
