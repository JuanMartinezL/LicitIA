"""
Limpiador y preparador del dataset del SECOP II.
Lee el CSV más reciente de data/raw/ y produce un dataset listo
para el entrenamiento del modelo en data/processed/

Uso:
    python data/cleaner.py
"""
import pandas as pd
import numpy as np
from pathlib import Path
import glob

RAW_PATH       = Path("data/raw")
PROCESSED_PATH = Path("data/processed")


def limpiar() -> pd.DataFrame:
    # Buscar el CSV más reciente en data/raw/
    archivos = sorted(glob.glob(str(RAW_PATH / "secop_contratos_*.csv")))
    if not archivos:
        print(" No hay archivos en data/raw/ — ejecuta primero: python data/secop_loader.py")
        return pd.DataFrame()

    archivo = archivos[-1]
    print(f"\n Leyendo: {archivo}")
    df = pd.read_csv(archivo, low_memory=False)
    print(f"   Filas originales: {len(df):,}")

    #  Eliminar duplicados
    antes = len(df)
    df = df.drop_duplicates(subset=["id_contrato"], keep="first")
    print(f"   Duplicados eliminados: {antes - len(df):,}")

    # Limpiar y convertir cuantía
    df["cuantia_contrato"] = pd.to_numeric(df["cuantia_contrato"], errors="coerce")
    df = df[df["cuantia_contrato"] > 0]
    df = df[df["cuantia_contrato"] < 1e12]   # eliminar cuantías absurdas

    #  Normalizar texto
    cols_texto = [
        "nombre_entidad", "tipo_de_contrato", "ciudad_entidad",
        "departamento_entidad", "modalidad_de_contratacion",
    ]
    for col in cols_texto:
        if col in df.columns:
            df[col] = (df[col].astype(str).str.strip().str.upper()
                       .replace({"NAN": np.nan, "NONE": np.nan, "": np.nan}))

    #  Variable objetivo — el modelo aprende a predecir esto
    #    1 = ganó (tiene proveedor seleccionado)
    #    0 = no ganó o no se sabe
    df["gano"] = df["proveedor_seleccionado"].notna().astype(int)

    #  Feature: logaritmo de cuantía (para el modelo)
    df["log_cuantia"] = np.log1p(df["cuantia_contrato"])

    #  Eliminar filas con columnas clave vacías
    df = df.dropna(subset=["nombre_entidad", "tipo_de_contrato", "cuantia_contrato"])

    #  Guardar dataset limpio
    PROCESSED_PATH.mkdir(parents=True, exist_ok=True)
    salida = PROCESSED_PATH / "secop_limpio.csv"
    df.to_csv(salida, index=False, encoding="utf-8")

    print(f"\n Dataset limpio: {len(df):,} filas")
    print(f"   Guardado en: {salida}")
    print(f"\n   Distribución variable objetivo (gano):")
    print(f"   {df['gano'].value_counts().to_dict()}")
    print(f"\n Siguiente paso: abre notebooks/02_entrenamiento.ipynb")
    return df


if __name__ == "__main__":
    limpiar()
