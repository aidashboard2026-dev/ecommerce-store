from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

class AdminNotificationBase(BaseModel):
    title: str
    message: str
    type: str
    event: str
    is_read: bool = False
    metadata_json: Optional[Dict[str, Any]] = Field(default=None, serialization_alias="metadata")

class AdminNotificationCreate(AdminNotificationBase):
    pass

class AdminNotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    event: str
    is_read: bool
    created_at: datetime
    metadata_json: Optional[Dict[str, Any]] = Field(default=None, serialization_alias="metadata")

    model_config = ConfigDict(from_attributes=True)


class AdminNotificationsListResponse(BaseModel):
    unread_count: int
    notifications: List[AdminNotificationResponse]
