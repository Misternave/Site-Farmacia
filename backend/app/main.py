import secrets

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models import Product, StockSyncRequest, PrescriptionRequest
from app.store import store

app = FastAPI(
    title="Pharmacy Stock Cloud API",
    version="0.2.0",
)

origins = [
    item.strip()
    for item in settings.allowed_origins.split(",")
    if item.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def verify_bridge_key(value: str | None):
    if value is None or not secrets.compare_digest(
        value,
        settings.bridge_api_key,
    ):
        raise HTTPException(status_code=401, detail="Invalid bridge key")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "products": store.count(),
        "last_sync_at": store.last_sync_at,
        "source": store.source,
    }


@app.post("/api/internal/stock/sync")
def sync_stock(
    payload: StockSyncRequest,
    x_bridge_key: str | None = Header(default=None),
):
    verify_bridge_key(x_bridge_key)

    store.replace(
        products=payload.products,
        synced_at=payload.synced_at,
        source=payload.source,
    )

    return {
        "status": "ok",
        "products_received": len(payload.products),
        "synced_at": payload.synced_at,
        "source": payload.source,
    }


@app.get("/api/products/search", response_model=list[Product])
def search_products(
    q: str = Query(default="", max_length=100),
    limit: int = Query(default=20, ge=1, le=50),
):
    return store.search(q, limit)


@app.get("/api/products/{cnpem}/availability")
def availability(cnpem: str):
    product = store.get_by_cnpem(cnpem)

    if not product:
        return {
            "found": False,
            "cnpem": cnpem,
            "available": False,
        }

    return {
        "found": True,
        "cnpem": cnpem,
        "name": product.nome,
        "available": product.available,
        "stock": product.stock_farmacia,
        "last_update": product.ultima_alteracao,
        "cloud_sync_at": store.last_sync_at,
    }


@app.post("/api/prescriptions/check")
def check_prescription(payload: PrescriptionRequest):
    items = []

    for cnpem in payload.cnpems:
        product = store.get_by_cnpem(cnpem)

        items.append({
            "cnpem": cnpem,
            "found": product is not None,
            "available": product.available if product else False,
            "product": product.model_dump() if product else None,
        })

    return {
        "all_available": bool(items)
        and all(item["available"] for item in items),
        "items": items,
        "last_sync_at": store.last_sync_at,
    }
