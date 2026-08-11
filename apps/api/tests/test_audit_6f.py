import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app
from app.core.config import settings
from app.api.deps import get_current_user_id, get_extension_user_id

client = TestClient(app)

def test_rate_limiting_enforced():
    # Bypass auth for rate limit test
    app.dependency_overrides[get_current_user_id] = lambda: "00000000-0000-0000-0000-000000000000"
    
    with patch("app.api.routes.extension.extension_service.generate_pairing_code", return_value="123456"):
        # Attempt to call pairing-code 10 times. Limit is 5/min.
        responses = []
        for _ in range(6):
            resp = client.post("/api/v1/extension/pairing-code", headers={"X-Forwarded-For": "1.2.3.4"})
            responses.append(resp.status_code)
            
        app.dependency_overrides.clear()
        
        # Clear rate limit storage so it doesn't pollute subsequent tests
        from app.core.rate_limit import limiter
        limiter._storage.reset()
        
        assert 429 in responses, f"Rate limiting did not block. Got: {responses}"

def test_100kb_payload_limit_rejected():
    app.dependency_overrides[get_extension_user_id] = lambda: "00000000-0000-0000-0000-000000000000"
    large_source_code = "a" * 105000 # 105 KB
    payload = {
        "problemSlug": "two-sum",
        "problemTitle": "Two Sum",
        "status": "Accepted",
        "source": "leetcode",
        "sourceCode": large_source_code,
        "submittedAt": "2023-01-01T12:00:00Z",
        "submissionId": "large-sub-1"
    }
    resp = client.post("/api/v1/leetcode/submissions", json=payload)
    app.dependency_overrides.clear()
    
    # Pydantic max_length should fail
    assert resp.status_code == 422
    assert "String should have at most 102400 characters" in resp.text

@patch("app.api.deps.get_supabase_client")
def test_email_verification_blocks_unverified(mock_get_supabase):
    mock_supabase = MagicMock()
    mock_get_supabase.return_value = mock_supabase
    
    # Mock user missing email_confirmed_at
    mock_user_res = MagicMock()
    mock_user_res.user = MagicMock()
    mock_user_res.user.id = "user-123"
    mock_user_res.user.email_confirmed_at = None
    
    mock_supabase.auth.get_user.return_value = mock_user_res
    
    # Enable email verification check
    settings.REQUIRE_EMAIL_VERIFICATION = True
    
    resp = client.post("/api/v1/extension/pairing-code", headers={"Authorization": "Bearer fake"})
    assert resp.status_code == 403
    assert resp.json()["detail"] == "Email verification required"
    
    # Restore
    settings.REQUIRE_EMAIL_VERIFICATION = False
