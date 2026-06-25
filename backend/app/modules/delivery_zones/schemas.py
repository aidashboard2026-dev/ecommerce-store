from typing import Optional
from pydantic import BaseModel, Field


class DeliveryZoneBase(BaseModel):
    city: str = Field(..., min_length=1, max_length=100)
    delivery_days: int = Field(..., ge=1, le=30)


class DeliveryZoneCreate(DeliveryZoneBase):
    pass


class DeliveryZoneUpdate(BaseModel):
    city: Optional[str] = Field(None, min_length=1, max_length=100)
    delivery_days: Optional[int] = Field(None, ge=1, le=30)


class DeliveryZoneResponse(DeliveryZoneBase):
    id: int

    class Config:
        from_attributes = True


class DeliveryEstimateResponse(BaseModel):
    city: str
    delivery_days: int
    message: str
