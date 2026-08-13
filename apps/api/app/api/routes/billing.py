from fastapi import APIRouter, Depends, Body, UploadFile, File
import uuid
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from app.api.deps import get_current_user_id
from app.services.billing_service import billing_service
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

class PaymentRequestPayload(BaseModel):
    upi_reference: str = Field(..., min_length=6, max_length=50)
    proof_url: str = Field(..., max_length=1000)
    user_note: Optional[str] = Field(None, max_length=500)

@router.get("/config")
async def get_billing_config() -> Dict[str, Any]:
    return billing_service.get_billing_config()

@router.get("/status")
async def get_billing_status(
    user_id: str = Depends(get_current_user_id)
) -> Dict[str, Any]:
    return billing_service.get_billing_status(user_id)

@router.post("/payment-request")
@limiter.limit("5/minute")
async def create_payment_request(
    request: Request,
    payload: PaymentRequestPayload = Body(...),
    user_id: str = Depends(get_current_user_id)
) -> Dict[str, Any]:
    return billing_service.create_payment_request(
        user_id=user_id,
        upi_reference=payload.upi_reference,
        proof_url=payload.proof_url,
        user_note=payload.user_note
    )

@router.post("/upload-proof")
async def upload_proof(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id)
) -> Dict[str, Any]:
    file_bytes = await file.read()
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    file_name = f"proof_{user_id}_{uuid.uuid4().hex}.{file_ext}"
    
    from app.integrations.supabase.client import get_supabase_client
    supabase = get_supabase_client()
    
    supabase.storage.from_("public_assets").upload(
        path=file_name,
        file=file_bytes,
        file_options={"content-type": file.content_type}
    )
    
    url = supabase.storage.from_("public_assets").get_public_url(file_name)
    return {"url": url}

