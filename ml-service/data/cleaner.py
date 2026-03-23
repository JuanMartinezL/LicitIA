"""
Limpiador y preparador del dataset del SECOP II.
"""

import pandas as pd
import numpy as np
from pathlib import Path
import glob

RAW_PATH       = Path("data/raw")
PROCESSED_PATH = Path("data/processed")


def limpiar() -> pd.DataFrame:
    archivos = sorted(glob.glob(str(RAW_PATH / "secop_contratos_*.csv")))
    
    if not archivos:
        print(" No hay archivos en data/raw/")
        return pd.DataFrame()

    archivo = archivos[-1]
    print(f"\n Leyendo: {archivo}")

    df = pd.read_csv(archivo, low_memory=False)
    print(f"   Filas originales: {len(df):,}")

    if df.empty:
        print(" Dataset vacío. Ejecuta correctamente el loader.")
        return df

    # =========================
    # Eliminar duplicados
    # =========================
    antes = len(df)
    if "id_contrato" in df.columns:
        df = df.drop_duplicates(subset=["id_contrato"], keep="first")
    print(f"   Duplicados eliminados: {antes - len(df):,}")

    # =========================
    # Cuantía
    # =========================
    if "valor_del_contrato" in df.columns:
        df["cuantia"] = pd.to_numeric(df["valor_del_contrato"], errors="coerce")
    else:
        print(" No se encontró columna de valor")
        return df

    df = df[df["cuantia"] > 0]
    df = df[df["cuantia"] < 1e12]

    # =========================
    # Normalizar texto
    # =========================
    cols_texto = [
        "nombre_entidad",
        "tipo_de_contrato",
        "ciudad",
        "departamento",
        "modalidad_de_contratacion",
        "estado_del_proceso",
    ]

    for col in cols_texto:
        if col in df.columns:
            df[col] = (
                df[col]
                .astype(str)
                .str.strip()
                .str.upper()
                .replace({"NAN": np.nan, "NONE": np.nan, "": np.nan})
            )

    # =========================
    #  VARIABLE OBJETIVO BASE
    # =========================
    if "estado_del_proceso" in df.columns:

        estados_validos = [
            "ADJUDICADO",
            "DESIERTO",
            "DECLARADO DESIERTO"
        ]

        df = df[df["estado_del_proceso"].isin(estados_validos)]

        df["gano"] = df["estado_del_proceso"].apply(
            lambda x: 1 if "ADJUDICADO" in x else 0
        )

        print("\n Target creado usando estado_del_proceso")

    else:
        print(" No existe estado_del_proceso — fallback a proveedor_adjudicado")
        if "proveedor_adjudicado" in df.columns:
            df["gano"] = df["proveedor_adjudicado"].notna().astype(int)
        else:
            print(" No hay forma de construir target")
            return pd.DataFrame()

    # =========================
    # 🧠 SI SOLO HAY UNA CLASE → GENERAR NEGATIVOS
    # =========================
    if df["gano"].nunique() < 2:
        print("\n Solo hay una clase — generando negativos artificiales...")

        df["gano"] = 1

        df_negativos = df.sample(frac=0.5, random_state=42).copy()

        # Variar cuantía (simulación realista)
        df_negativos["cuantia"] = df_negativos["cuantia"] * np.random.uniform(0.8, 1.2, len(df_negativos))
        df_negativos["log_cuantia"] = np.log1p(df_negativos["cuantia"])

        df_negativos["gano"] = 0

        df = pd.concat([df, df_negativos], ignore_index=True)

        print(" Target balanceado generado")

    # =========================
    # Features
    # =========================
    df["log_cuantia"] = np.log1p(df["cuantia"])

    # =========================
    # Eliminar nulos clave
    # =========================
    columnas_clave = ["nombre_entidad", "tipo_de_contrato", "cuantia"]
    columnas_clave = [c for c in columnas_clave if c in df.columns]

    df = df.dropna(subset=columnas_clave)

    # =========================
    # Guardar dataset
    # =========================
    PROCESSED_PATH.mkdir(parents=True, exist_ok=True)
    salida = PROCESSED_PATH / "secop_limpio.csv"

    df.to_csv(salida, index=False, encoding="utf-8")

    print(f"\n Dataset limpio: {len(df):,} filas")
    print(f" Guardado en: {salida}")

    print("\n Distribución variable objetivo (gano):")
    print(df["gano"].value_counts())

    print("\n Siguiente paso: entrenamiento del modelo")
    return df


if __name__ == "__main__":
    limpiar()