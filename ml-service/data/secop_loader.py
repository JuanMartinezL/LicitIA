"""
Descargador de datos del SECOP II
Ahora trae procesos con diferentes estados para permitir ML real.
"""

import requests
import pandas as pd
from pathlib import Path
from datetime import datetime

SECOP_URL = "https://www.datos.gov.co/resource/jbjy-vk9h.json"
RAW_PATH  = Path("data/raw")

COLUMNAS = [
    "id_contrato",
    "nombre_entidad",
    "nit_entidad",
    "departamento",
    "ciudad",
    "tipo_de_contrato",
    "modalidad_de_contratacion",
    "valor_del_contrato",
    "proveedor_adjudicado",
    "fecha_de_firma",
    "estado_contrato"
]


def descargar_contratos(limite: int = 50000) -> pd.DataFrame:
    todos  = []
    offset = 0
    bloque = 1000

    print(f"\n Descargando hasta {limite:,} registros del SECOP II...\n")

    while offset < limite:
        params = {
            "$limit":  bloque,
            "$offset": offset,
        }

        try:
            resp = requests.get(
                SECOP_URL,
                params=params,
                timeout=30,
                headers={"User-Agent": "LicitIA-ML-Service"}
            )
            resp.raise_for_status()
        except requests.exceptions.RequestException as e:
            print(f"\n Error en offset {offset}: {e}")
            break

        data = resp.json()

        if not data:
            print(f"\n No hay más registros (offset {offset})")
            break

        todos.extend(data)
        offset += bloque
        print(f"   Descargados: {len(todos):,}", end="\r")

    if not todos:
        print(" No se descargaron datos.")
        return pd.DataFrame()

    df = pd.DataFrame(todos)

    
    #  FILTRO MEJORADO
    
    if "estado_contrato" in df.columns:
        df["estado_contrato"] = df["estado_contrato"].astype(str).str.upper()

        estados_validos = [
            "CERRADO",      # contratos finalizados
            "ANULADO",      # cancelados
            "TERMINADO",    # finalizados
            "LIQUIDADO"     # cerrados financieros
        ]

        df = df[df["estado_contrato"].isin(estados_validos)]

        print("\n🎯 Filtrado por estados relevantes:")
        print(df["estado_contrato"].value_counts())

    
    # Columnas
    
    columnas_validas = [col for col in COLUMNAS if col in df.columns]
    df = df[columnas_validas]

    
    # Limpieza
    
    if "valor_del_contrato" in df.columns:
        df["valor_del_contrato"] = pd.to_numeric(df["valor_del_contrato"], errors="coerce")

    
    # Guardar
    
    RAW_PATH.mkdir(parents=True, exist_ok=True)
    ts      = datetime.now().strftime("%Y%m%d_%H%M")
    archivo = RAW_PATH / f"secop_contratos_{ts}.csv"

    df.to_csv(archivo, index=False, encoding="utf-8")

    print(f"\n {len(df):,} registros guardados en: {archivo}")

    _resumen(df)

    return df


def _resumen(df: pd.DataFrame):
    print("\n RESUMEN DEL DATASET")
    print("─" * 45)
    print(f"  Total registros:     {len(df):>10,}")
    print(f"  Columnas:            {len(df.columns):>10}")

    if "estado_contrato" in df.columns:
        print("\n Distribución estados:")
        print(df["estado_contrato"].value_counts())

    if "nombre_entidad" in df.columns:
        print(f"\n  Entidades únicas:    {df['nombre_entidad'].nunique():>10,}")

    if "valor_del_contrato" in df.columns:
        cuantias = df["valor_del_contrato"].dropna()
        if not cuantias.empty:
            print(f"  Valor promedio:     ${cuantias.mean():>12,.0f}")
            print(f"  Valor máximo:       ${cuantias.max():>12,.0f}")

    print("─" * 45)


if __name__ == "__main__":
    descargar_contratos(limite=50000)