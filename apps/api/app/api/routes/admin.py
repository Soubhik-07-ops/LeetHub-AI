from fastapi import APIRouter, Depends, Body, Query, UploadFile, File
from typing import Dict, Any, List, Optional
import uuid
from pydantic import BaseModel, Field
from app.api.deps import get_current_admin_user
from app.services.admin_service import admin_service

router = APIRouter()

class AdminReviewPayload(BaseModel):
    admin_note: Optional[str] = Field(None, max_length=500)

@router.get("/dashboard")
async def get_dashboard_stats(
    admin_id: str = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    return admin_service.get_dashboard_stats()

@router.get("/payments")
async def list_payments(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    admin_id: str = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    return admin_service.list_payment_requests(status=status, page=page, limit=limit)

@router.get("/users")
async def list_users(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    admin_id: str = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    return admin_service.list_users(page=page, limit=limit, search=search)

@router.get("/subscriptions")
async def list_subscriptions(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    admin_id: str = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    return admin_service.list_subscriptions(page=page, limit=limit)

@router.get("/usage")
async def list_ai_usage(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    admin_id: str = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    return admin_service.list_ai_usage(page=page, limit=limit)

@router.get("/logs")
async def list_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    admin_id: str = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    return admin_service.list_audit_logs(page=page, limit=limit)

@router.post("/payments/{request_id}/approve")
async def approve_payment(
    request_id: str,
    payload: AdminReviewPayload = Body(...),
    admin_id: str = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    return admin_service.approve_payment(
        request_id=request_id,
        admin_id=admin_id,
        admin_note=payload.admin_note
    )

@router.post("/payments/{request_id}/reject")
async def reject_payment(
    request_id: str,
    payload: AdminReviewPayload = Body(...),
    admin_id: str = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    return admin_service.reject_payment(
        request_id=request_id,
        admin_id=admin_id,
        admin_note=payload.admin_note
    )

@router.get("/settings")
async def get_settings(
    admin_id: str = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    return admin_service.get_settings()

@router.put("/settings/{settings_key}")
async def update_settings(
    settings_key: str,
    payload: Dict[str, Any] = Body(...),
    admin_id: str = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    return admin_service.update_settings(
        admin_id=admin_id,
        settings_key=settings_key,
        payload=payload
    )

@router.post("/settings/upload-qr")
async def upload_qr(
    file: UploadFile = File(...),
    admin_id: str = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    file_bytes = await file.read()
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    file_name = f"qr_{uuid.uuid4().hex}.{file_ext}"
    
    from app.integrations.supabase.client import get_supabase_client
    supabase = get_supabase_client()
    
    supabase.storage.from_("public_assets").upload(
        path=file_name,
        file=file_bytes,
        file_options={"content-type": file.content_type}
    )
    
    url = supabase.storage.from_("public_assets").get_public_url(file_name)
    return {"url": url}

