from threading import RLock
from app.models import Product

class StockStore:
    def __init__(self):
        self._lock = RLock()
        self._products_by_cnpem: dict[str, Product] = {}
        self._all_products: list[Product] = []
        self.last_sync_at: str | None = None
        self.source: str | None = None

    def replace(self, products: list[Product], synced_at: str, source: str):
        by_cnpem = {
            str(p.cnpem): p
            for p in products
            if p.cnpem is not None
        }

        with self._lock:
            self._all_products = list(products)
            self._products_by_cnpem = by_cnpem
            self.last_sync_at = synced_at
            self.source = source

    def search(self, query: str, limit: int = 20):
        q = query.strip().lower()

        with self._lock:
            products = list(self._all_products)

        if not q:
            return products[:limit]

        results = [
            p for p in products
            if q in p.nome.lower()
            or q in (p.cnpem or "").lower()
            or q in (p.cnpem_desig or "").lower()
        ]

        return results[:limit]

    def get_by_cnpem(self, cnpem: str):
        with self._lock:
            return self._products_by_cnpem.get(cnpem.strip())

    def count(self):
        with self._lock:
            return len(self._all_products)

store = StockStore()
