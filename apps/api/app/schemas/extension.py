from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class PairingCodeResponse(BaseModel):
    code: str
    expires_in_seconds: int

class ExtensionLinkRequest(BaseModel):
    code: str

class ExtensionLinkResponse(BaseModel):
    credential: str

class ExtensionStatusResponse(BaseModel):
    connected: bool
    device_id: Optional[str] = None
    connected_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
