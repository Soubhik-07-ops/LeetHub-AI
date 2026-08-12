from fastapi import APIRouter, Depends, HTTPException, status, Request
from app.api.deps import get_current_user_id, get_extension_user_id
from app.core.rate_limit import limiter
from app.schemas.extension import PairingCodeResponse, ExtensionLinkRequest, ExtensionLinkResponse, ExtensionStatusResponse
from app.services.extension_service import extension_service

router = APIRouter()

@router.get("/status", response_model=ExtensionStatusResponse)
def get_extension_status(user_id: str = Depends(get_current_user_id)):
    return extension_service.get_connection_status(user_id)

@router.get("/verify")
def verify_extension_credential(user_id: str = Depends(get_extension_user_id)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid credential")
    return {"status": "ok"}

@router.delete("/unlink")
def unlink_extension_self(user_id: str = Depends(get_extension_user_id)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid credential")
    extension_service.revoke_connection(user_id)
    return {"status": "unlinked"}

@router.delete("/disconnect")
def disconnect_extension(user_id: str = Depends(get_current_user_id)):
    extension_service.revoke_connection(user_id)
    return {"status": "disconnected"}

@router.post("/pairing-code", response_model=PairingCodeResponse)
@limiter.limit("5/minute")
def create_pairing_code(request: Request, user_id: str = Depends(get_current_user_id)):
    code = extension_service.generate_pairing_code(user_id)
    return PairingCodeResponse(code=code, expires_in_seconds=600)

@router.post("/link", response_model=ExtensionLinkResponse)
@limiter.limit("5/minute")
def link_extension(request: Request, body: ExtensionLinkRequest):
    credential = extension_service.link_extension(body.code)
    return ExtensionLinkResponse(credential=credential)
