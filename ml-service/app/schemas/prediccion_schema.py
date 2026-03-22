from pydantic import BaseModel, Field
from typing import Optional, List

class LicitacionInput(BaseModel):
    """
    Datos de entrada para la predicción.
    El MS1 envía estos campos cuando un usuario analiza una licitación.
    """
    entidad:   str             = Field(..., description="Nombre de la entidad contratante")
    cuantia:   float           = Field(..., gt=0, description="Cuantía estimada en pesos COP")
    sector:    str             = Field(..., description="Tipo de contrato / sector")
    municipio: Optional[str]   = Field("", description="Municipio de la entidad")
    modalidad: Optional[str]   = Field("", description="Modalidad de contratación")
    nit:       Optional[str]   = Field("", description="NIT de la empresa que licita")

    class Config:
        json_schema_extra = {
            "example": {
                "entidad":   "MINISTERIO DE SALUD Y PROTECCIÓN SOCIAL",
                "cuantia":   250000000,
                "sector":    "Consultoría",
                "municipio": "BOGOTA",
                "modalidad": "Selección Abreviada",
                "nit":       "900123456",
            }
        }

class PrediccionOutput(BaseModel):
    """Resultado de la predicción devuelto al MS1."""
    probabilidad:       float      = Field(..., description="Probabilidad entre 0 y 1")
    porcentaje:         int        = Field(..., description="Probabilidad en porcentaje (0-100)")
    factores_positivos: List[str]  = Field(default_factory=list)
    factores_negativos: List[str]  = Field(default_factory=list)
    recomendaciones:    List[str]  = Field(default_factory=list)
    modo:               str        = Field("mock", description="'real' si usa el modelo, 'mock' si es estimación")
