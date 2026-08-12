import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app
from app.api.deps import get_current_user_id

client = TestClient(app)

def create_mock_rpc(data):
    mock_client = MagicMock()
    mock_rpc = MagicMock()
    mock_res = MagicMock()
    mock_res.data = data
    
    mock_rpc.execute.return_value = mock_res
    mock_client.rpc.return_value = mock_rpc
    return mock_client, mock_rpc

@patch('app.services.intelligence_service.get_supabase_client')
def test_topic_intelligence_scoring(mock_get_client):
    app.dependency_overrides[get_current_user_id] = lambda: "test-user"
    try:
        mock_data = [
            {"topic": "Arrays", "attempted_problems": 3, "accepted_problems": 2, "total_submissions": 3},
            {"topic": "Math", "attempted_problems": 2, "accepted_problems": 2, "total_submissions": 2},
            {"topic": "Dynamic Programming", "attempted_problems": 10, "accepted_problems": 2, "total_submissions": 20}
        ]
        mock_client, _ = create_mock_rpc(mock_data)
        mock_get_client.return_value = mock_client
        
        response = client.get("/api/v1/analytics/intelligence/topics")
        assert response.status_code == 200
        
        expected = [
            {
                "topic": "Arrays",
                "attempted": 3,
                "accepted": 2,
                "acceptance_rate": 66.67,
                "total_submissions": 3,
                "strength": "stable",
                "weakness_score": 10.0,
                "confidence": "medium"
            },
            {
                "topic": "Math",
                "attempted": 2,
                "accepted": 2,
                "acceptance_rate": 100.0,
                "total_submissions": 2,
                "strength": "strong",
                "weakness_score": 0.0,
                "confidence": "low"
            },
            {
                "topic": "Dynamic Programming",
                "attempted": 10,
                "accepted": 2,
                "acceptance_rate": 20.0,
                "total_submissions": 20,
                "strength": "weak",
                "weakness_score": 62.0,
                "confidence": "high"
            }
        ]
        
        actual = response.json()["topics"]
        for i in range(len(expected)):
            assert actual[i]["topic"] == expected[i]["topic"]
            assert actual[i]["confidence"] == expected[i]["confidence"]
        
    finally:
        app.dependency_overrides.pop(get_current_user_id, None)

@patch('app.services.intelligence_service.get_supabase_client')
def test_difficulty_intelligence(mock_get_client):
    app.dependency_overrides[get_current_user_id] = lambda: "test-user"
    try:
        mock_data = [
            {"difficulty": "Easy", "attempted_problems": 5, "accepted_problems": 5, "total_submissions": 5},
            {"difficulty": "Hard", "attempted_problems": 2, "accepted_problems": 0, "total_submissions": 4},
        ]
        mock_client, _ = create_mock_rpc(mock_data)
        mock_get_client.return_value = mock_client
        
        res = client.get("/api/v1/analytics/intelligence/difficulty")
        assert res.status_code == 200
        data = res.json()["difficulties"]
        
        assert len(data) == 2
        assert data[0]["difficulty"] == "Easy"
        assert data[0]["acceptance_rate"] == 100.0
        
        assert data[1]["difficulty"] == "Hard"
        assert data[1]["acceptance_rate"] == 0.0
    finally:
        app.dependency_overrides.pop(get_current_user_id, None)
