import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_current_user_id
import uuid

# We will manipulate this in tests
mock_user_id = "test-user-id"

async def override_get_current_user_id():
    if not mock_user_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    return mock_user_id

@pytest.fixture(autouse=True)
def override_deps():
    app.dependency_overrides[get_current_user_id] = override_get_current_user_id
    yield
    app.dependency_overrides.clear()
client = TestClient(app)

@pytest.fixture
def mock_supabase():
    with patch("app.services.ai_coach_service.get_supabase_client") as mock:
        yield mock

@pytest.fixture
def mock_intelligence_service():
    with patch("app.services.ai_coach_service.intelligence_service") as mock:
        yield mock

@pytest.fixture
def mock_provider():
    with patch("app.services.ai_coach_service.ai_coach_service.provider") as mock:
        mock.analyze_submission = AsyncMock()
        mock.generate_chat_response = AsyncMock()
        mock.model = "openrouter/free"
        yield mock

@pytest.fixture
def mock_usage_service():
    with patch("app.services.ai_coach_service.ai_usage_service") as mock:
        mock.reserve_quota.return_value = (True, "mock_usage_id", "test-model")
        yield mock

def test_analyze_submission_unauthorized():
    global mock_user_id
    mock_user_id = None
    response = client.post("/api/v1/ai/analyze/12345678-1234-5678-1234-567812345678")
    assert response.status_code == 401
    mock_user_id = "test-user-id"

def test_analyze_submission_cross_user(mock_supabase):
    # Setup mock to return no submission (simulating another user's submission)
    mock_sub_res = MagicMock()
    mock_sub_res.data = None
    
    mock_client_instance = mock_supabase.return_value
    mock_client_instance.from_.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = mock_sub_res
    
    response = client.post("/api/v1/ai/analyze/12345678-1234-5678-1234-567812345678")
    assert response.status_code == 403
    assert "Submission not found or access denied" in response.text

def test_analyze_submission_invalid_schema(mock_supabase, mock_provider, mock_intelligence_service, mock_usage_service):
    # Mocking chain
    mock_sub_res = MagicMock()
    mock_sub_res.data = {
        "id": "12345678-1234-5678-1234-567812345678",
        "problem_title": "Two Sum",
        "status": "rejected",
        "source_code": "def twoSum(): pass"
    }
    mock_existing_res = MagicMock()
    mock_existing_res.data = [] 
    
    mock_client_instance = mock_supabase.return_value
    mock_client_instance.from_.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = mock_sub_res
    mock_client_instance.from_.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_existing_res
    
    # Return valid JSON but invalid schema
    mock_provider.analyze_submission.return_value = {"invalid": "schema"}
    
    response = client.post("/api/v1/ai/analyze/12345678-1234-5678-1234-567812345678")
    
    # Due to invalid schema, it raises RuntimeError now, returning 502
    assert response.status_code == 502
    assert "Failed to communicate with AI provider" in response.text

def test_chat_unauthorized():
    global mock_user_id
    mock_user_id = None
    response = client.post("/api/v1/ai/chat", json={"message": "hello"})
    assert response.status_code == 401
    mock_user_id = "test-user-id"

def test_chat_empty_message():
    response = client.post("/api/v1/ai/chat", json={"message": ""})
    assert response.status_code == 422 # Pydantic validation

def test_chat_oversized_message():
    response = client.post("/api/v1/ai/chat", json={"message": "a" * 1001})
    assert response.status_code == 422

def test_chat_cross_user(mock_supabase):
    # Simulating conversation belongs to someone else
    mock_conv_res = MagicMock()
    mock_conv_res.data = []
    
    mock_client_instance = mock_supabase.return_value
    mock_client_instance.from_.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_conv_res
    
    response = client.post("/api/v1/ai/chat", json={
        "message": "hello",
        "conversation_id": "12345678-1234-5678-1234-567812345678"
    })
    
    assert response.status_code == 403
    assert "Conversation not found or access denied" in response.text

def test_rate_limiting(mock_supabase, mock_provider, mock_intelligence_service, mock_usage_service):
    # Mocking chain to succeed
    mock_sub_res = MagicMock()
    mock_sub_res.data = {
        "id": "12345678-1234-5678-1234-567812345678",
        "problem_title": "Two Sum",
        "status": "rejected",
        "source_code": "def twoSum(): pass"
    }
    mock_existing_res = MagicMock()
    mock_existing_res.data = []
    
    mock_client_instance = mock_supabase.return_value
    mock_client_instance.from_.return_value.select.return_value.eq.return_value.eq.return_value.single.return_value.execute.return_value = mock_sub_res
    mock_client_instance.from_.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = mock_existing_res
    
    mock_provider.analyze_submission.return_value = {
        "time_complexity": "O(N^2)",
        "space_complexity": "O(1)",
        "overall_quality": "Needs improvement",
        "mistakes": [],
        "hints": []
    }

    # Make 6 fast requests. Rate limit is 5/minute
    responses = []
    for _ in range(6):
        resp = client.post("/api/v1/ai/analyze/12345678-1234-5678-1234-567812345678")
        responses.append(resp.status_code)
        
    assert 429 in responses
