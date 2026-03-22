"""
parta tener en cuenta 
Descargador de datos del SECOP II
Descarga contratos liquidados de datos.gov.co para entrenar el modelo.

Uso:
    cd ml-service
    venv\Scripts\activate
    python data/secop_loader.py
"""
import requests
import pandas as pd
from pathlib import Path
from datetime import datetime

SECOP_URL = "https://www.datos.gov.co/resource/jbjy-vk9h.json"
RAW_PATH  = Path("data/raw")

COLUMNAS = (
    "id_contrato,nombre_entidad,nit_entidad,"
    "departamento_entidad,ciudad_entidad,"
    "tipo_de_contrato,modalidad_de_contratacion,"
    "cuantia_contrato,proveedor_seleccionado,"
    "fecha_de_firma,estado_contrato"
)


def descargar_contratos(limite: int = 50000) -> pd.DataFrame:
    """
    Descarga contratos liquidados del SECOP II en bloques de 1000.
    Solo descarga contratos LIQUIDADOS porque son los que tienen resultado
    conocido (ganó/perdió) — necesario para el entrenamiento supervisado.
    """
    todos  = []
    offset = 0
    bloque = 1000

    print(f"\n Descargando hasta {limite:,} contratos del SECOP II...")
    print(f"   Solo contratos LIQUIDADOS (tienen resultado conocido)\n")

    while offset < limite:
        params = {
            "$limit":  bloque,
            "$offset": offset,
            "$where":  "estado_contrato='Liquidado'",
            "$select": COLUMNAS,
            "$order":  "fecha_de_firma DESC",
        }

        try:
            resp = requests.get(SECOP_URL, params=params, timeout=30)
            resp.raise_for_status()
        except requests.exceptions.Timeout:
            print(f"\n Timeout en offset {offset}. Guardando lo descargado hasta ahora...")
            break
        except requests.exceptions.RequestException as e:
            print(f"\n Error en offset {offset}: {e}")
            break

        data = resp.json()
        if not data:
            print(f"\n No hay más registros disponibles (offset {offset})")
            break

        todos.extend(data)
        offset += bloque
        print(f"   Descargados: {len(todos):,} contratos...", end="\r")

    if not todos:
        print(" No se descargaron datos. Verifica tu conexión a internet.")
        return pd.DataFrame()

    df = pd.DataFrame(todos)

    # Guardar con timestamp para no sobreescribir descargas anteriores
    RAW_PATH.mkdir(parents=True, exist_ok=True)
    ts      = datetime.now().strftime("%Y%m%d_%H%M")
    archivo = RAW_PATH / f"secop_contratos_{ts}.csv"
    df.to_csv(archivo, index=False, encoding="utf-8")

    print(f"\n {len(df):,} contratos guardados en: {archivo}")
    _resumen(df)
    return df


def _resumen(df: pd.DataFrame):
    """Muestra estadísticas básicas del dataset descargado."""
    print("\n RESUMEN DEL DATASET")
    print("─" * 45)
    print(f"  Total contratos:      {len(df):>10,}")
    print(f"  Columnas:             {len(df.columns):>10}")
    print(f"  Entidades únicas:     {df['nombre_entidad'].nunique():>10,}")
    print(f"  Sectores únicos:      {df['tipo_de_contrato'].nunique():>10,}")
    print(f"  Departamentos:        {df['departamento_entidad'].nunique():>10,}")

    cuantias = pd.to_numeric(df["cuantia_contrato"], errors="coerce").dropna()
    if not cuantias.empty:
        print(f"  Cuantía promedio:   ${cuantias.mean():>12,.0f}")
        print(f"  Cuantía máxima:     ${cuantias.max():>12,.0f}")

    print(f"\n  Rango de fechas:")
    print(f"    Más antiguo: {df['fecha_de_firma'].min()}")
    print(f"    Más reciente:{df['fecha_de_firma'].max()}")
    print("─" * 45)


if __name__ == "__main__":
    descargar_contratos(limite=50000)
