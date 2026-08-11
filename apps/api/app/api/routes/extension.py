from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user_id
from app.schemas.extension import PairingCodeResponse, ExtensionLinkRequest, ExtensionLinkResponse, ExtensionStatusResponse
from app.services.extension_service import extension_service

router = APIRouter()

@router.get("/status", response_model=ExtensionStatusResponse)
def get_extension_status(user_id: str = Depends(get_current_user_id)):
    return extension_service.get_connection_status(user_id)

@router.delete("/disconnect")
def disconnect_extension(user_id: str = Depends(get_current_user_id)):
    extension_service.revoke_connection(user_id)
    return {"status": "disconnected"}

@router.post("/pairing-code", response_model=PairingCodeResponse)
def create_pairing_code(user_id: str = Depends(get_current_user_id)):
    code = extension_service.generate_pairing_code(user_id)
    return PairingCodeResponse(code=code, expires_in_seconds=600)

@router.post("/link", response_model=ExtensionLinkResponse)
def link_extension(request: ExtensionLinkRequest):
    credential = extension_service.link_extension(request.code)
    return ExtensionLinkResponse(credential=credential)
