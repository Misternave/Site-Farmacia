import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

RAILWAY_API_URL = os.environ["RAILWAY_API_URL"].rstrip("/")
BRIDGE_API_KEY = os.environ["BRIDGE_API_KEY"]
SYNC_INTERVAL_SECONDS = int(os.getenv("SYNC_INTERVAL_SECONDS", "30"))
DATA_SOURCE = os.getenv("DATA_SOURCE", "mock").lower()
MOCK_DATA_FILE = os.getenv("MOCK_DATA_FILE", "mock_products.json")


def load_mock_products():
    path = Path(__file__).parent / MOCK_DATA_FILE
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def load_oracle_products():
    import oracledb

    connection = oracledb.connect(
        user=os.environ["ORACLE_USER"],
        password=os.environ["ORACLE_PASSWORD"],
        host=os.environ["ORACLE_HOST"],
        port=int(os.getenv("ORACLE_PORT", "1521")),
        service_name=os.getenv("ORACLE_SERVICE", "ORCL"),
    )

    sql = """
        SELECT
            CODIGO,
            NOME,
            CNPEM,
            CNPEM_DESIG,
            STK_FARMACIA,
            ESGOTADO,
            COMERC_AUTORIZ,
            INATIVO,
            DT_ULT_ATERACAO
        FROM SIFV_PRODUTOS
        WHERE CNPEM IS NOT NULL
    """

    products = []

    with connection:
        with connection.cursor() as cursor:
            cursor.execute(sql)

            for row in cursor:
                (
                    codigo,
                    nome,
                    cnpem,
                    cnpem_desig,
                    stock,
                    esgotado,
                    comerc_autoriz,
                    inativo,
                    updated,
                ) = row

                products.append({
                    "codigo": str(codigo),
                    "nome": nome or "",
                    "cnpem": str(cnpem) if cnpem is not None else None,
                    "cnpem_desig": cnpem_desig,
                    "stock_farmacia": float(stock or 0),
                    "esgotado": esgotado,
                    "comerc_autoriz": comerc_autoriz,
                    "inativo": inativo,
                    "ultima_alteracao": updated.isoformat() if hasattr(updated, "isoformat") else None,
                })

    return products


def load_products():
    if DATA_SOURCE == "oracle":
        return load_oracle_products()
    return load_mock_products()


def sync_once():
    products = load_products()

    payload = {
        "source": DATA_SOURCE,
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "products": products,
    }

    response = requests.post(
        f"{RAILWAY_API_URL}/api/internal/stock/sync",
        json=payload,
        headers={
            "X-Bridge-Key": BRIDGE_API_KEY,
            "Content-Type": "application/json",
        },
        timeout=30,
    )

    response.raise_for_status()

    result = response.json()
    print(
        f"[{datetime.now().isoformat(timespec='seconds')}] "
        f"Synced {result['products_received']} products "
        f"to Railway ({result['status']})."
    )


def main():
    print("Sifarma Mac Bridge")
    print(f"Source: {DATA_SOURCE}")
    print(f"Railway: {RAILWAY_API_URL}")
    print(f"Interval: {SYNC_INTERVAL_SECONDS}s")
    print()

    while True:
        try:
            sync_once()
        except KeyboardInterrupt:
            print("\nStopped.")
            break
        except Exception as exc:
            print(
                f"[{datetime.now().isoformat(timespec='seconds')}] "
                f"Sync failed: {exc}"
            )

        time.sleep(SYNC_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
