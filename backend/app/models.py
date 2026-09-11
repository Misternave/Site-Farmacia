from typing import Optional
from pydantic import BaseModel, Field

class Product(BaseModel):
    codigo: str
    nome: str
    cnpem: Optional[str] = None
    cnpem_desig: Optional[str] = None
    stock_farmacia: float = 0
    esgotado: Optional[str] = None
    comerc_autoriz: Optional[str] = None
    inativo: Optional[str] = None
    ultima_alteracao: Optional[str] = None

    @property
    def available(self) -> bool:
        return (
            self.stock_farmacia > 0
            and (self.inativo or "N").upper() != "S"
            and (self.comerc_autoriz or "S").upper() != "N"
        )

class StockSyncRequest(BaseModel):
    source: str
    synced_at: str
    products: list[Product] = Field(default_factory=list)

class PrescriptionRequest(BaseModel):
    cnpems: list[str]
