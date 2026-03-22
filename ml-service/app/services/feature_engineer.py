"""
Feature Engineering para LicitaIA
Transforma los datos crudos de una licitación en el vector numérico
que entiende el modelo Random Forest.

IMPORTANTE: El orden de los features DEBE ser idéntico al usado
durante el entrenamiento en el notebook 02_entrenamiento.ipynb
"""
import numpy as np
from app.schemas.prediccion_schema import LicitacionInput

# Sectores con alta competencia histórica en el SECOP II colombiano
SECTORES_COMPETIDOS = [
    "OBRA", "CONSULTORÍA", "SUMINISTRO", "INTERVENTORÍA",
    "PRESTACIÓN DE SERVICIOS", "COMPRAVENTA",
]

# Modalidades más abiertas (más competidores)
MODALIDADES_ABIERTAS = [
    "LICITACIÓN PÚBLICA", "CONCURSO DE MÉRITOS",
    "SELECCIÓN ABREVIADA",
]

# Entidades del Estado con alto volumen de contratos
ENTIDADES_ALTO_VOLUMEN = [
    "MINISTERIO", "GOBERNACIÓN", "ALCALDÍA",
    "HOSPITAL", "ESE", "ICBF",
]


def construir_features(datos: LicitacionInput) -> list:
    """
    Convierte los datos de una licitación en un vector de 8 features numéricos.

    Returns:
        list: Vector de features [f1, f2, f3, f4, f5, f6, f7, f8]
    """
    sector_upper    = (datos.sector    or "").upper()
    modalidad_upper = (datos.modalidad or "").upper()
    entidad_upper   = (datos.entidad   or "").upper()

    features = [
        # F1: Logaritmo de la cuantía (normaliza la distribución sesgada)
        np.log1p(datos.cuantia),

        # F2: ¿Está en el rango de cuantía más común? ($50M - $800M)
        1 if 50_000_000 <= datos.cuantia <= 800_000_000 else 0,

        # F3: ¿Cuantía muy alta? (> $2.000M — exige más requisitos)
        1 if datos.cuantia > 2_000_000_000 else 0,

        # F4: ¿Sector con alta competencia?
        1 if any(s in sector_upper for s in SECTORES_COMPETIDOS) else 0,

        # F5: ¿Modalidad abierta? (más competidores = más difícil)
        1 if any(m in modalidad_upper for m in MODALIDADES_ABIERTAS) else 0,

        # F6: ¿Entidad de alto volumen de contratos?
        1 if any(e in entidad_upper for e in ENTIDADES_ALTO_VOLUMEN) else 0,

        # F7: ¿Empresa tiene NIT registrado? (puede consultar historial)
        1 if datos.nit and len(datos.nit.strip()) > 5 else 0,

        # F8: ¿Tiene municipio especificado? (contextualiza la competencia local)
        1 if datos.municipio and datos.municipio.strip() else 0,
    ]

    return features


def nombres_features() -> list:
    """Retorna los nombres de los features (útil para SHAP y debugging)."""
    return [
        "log_cuantia",
        "cuantia_rango_medio",
        "cuantia_muy_alta",
        "sector_competido",
        "modalidad_abierta",
        "entidad_alto_volumen",
        "tiene_nit",
        "tiene_municipio",
    ]


def describir_features(datos: LicitacionInput) -> dict:
    """Retorna un diccionario legible para debugging."""
    valores = construir_features(datos)
    return dict(zip(nombres_features(), valores))
