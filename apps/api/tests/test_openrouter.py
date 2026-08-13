import pytest
import httpx
from unittest.mock import patch, MagicMock, AsyncMock
from app.integrations.llm.openrouter import OpenRouterProvider
import json

@pytest.fixture
def provider():
    with patch("os.getenv", return_value="fake-token"):
        return OpenRouterProvider()

@pytest.mark.asyncio
async def test_extract_json_pure():
    provider = OpenRouterProvider()
    res = provider._extract_json('{"key": "value"}')
    assert res == {"key": "value"}

@pytest.mark.asyncio
async def test_extract_json_markdown():
    provider = OpenRouterProvider()
    res = provider._extract_json('```json\n{"key": "value"}\n```')
    assert res == {"key": "value"}

@pytest.mark.asyncio
async def test_extract_json_surrounded():
    provider = OpenRouterProvider()
    res = provider._extract_json('Here is your json: {"key": "value"} Enjoy!')
    assert res == {"key": "value"}

@pytest.mark.asyncio
async def test_extract_json_malformed():
    provider = OpenRouterProvider()
    with pytest.raises(RuntimeError, match="Could not extract valid JSON"):
        provider._extract_json('{"key": "value"') # missing brace

@pytest.mark.asyncio
async def test_extract_json_empty():
    provider = OpenRouterProvider()
    with pytest.raises(RuntimeError):
        provider._extract_json('')

@pytest.mark.asyncio
@patch("httpx.AsyncClient.post")
async def test_execute_with_retry_success_first_try(mock_post, provider):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"success": True}
    mock_response.raise_for_status = MagicMock()
    mock_post.return_value = mock_response

    res = await provider._execute_with_retry({"payload": "test"})
    assert res == {"success": True}
    assert mock_post.call_count == 1

@pytest.mark.asyncio
@patch("httpx.AsyncClient.post")
@patch("asyncio.sleep")
async def test_execute_with_retry_429(mock_sleep, mock_post, provider):
    resp_429 = MagicMock()
    resp_429.status_code = 429
    error = httpx.HTTPStatusError("Rate Limit", request=MagicMock(), response=resp_429)
    resp_429.raise_for_status.side_effect = error

    resp_200 = MagicMock()
    resp_200.status_code = 200
    resp_200.json.return_value = {"success": True}
    
    mock_post.side_effect = [resp_429, resp_200]
    
    res = await provider._execute_with_retry({"payload": "test"})
    assert mock_post.call_count == 2

@pytest.mark.asyncio
@patch("httpx.AsyncClient.post")
@patch("asyncio.sleep")
async def test_execute_with_retry_exhaustion(mock_sleep, mock_post, provider):
    resp_500 = MagicMock()
    resp_500.status_code = 500
    error = httpx.HTTPStatusError("Server Error", request=MagicMock(), response=resp_500)
    resp_500.raise_for_status.side_effect = error

    mock_post.side_effect = error
    
    with pytest.raises(RuntimeError, match="AI Provider unavailable"):
        await provider._execute_with_retry({"payload": "test"})
        
    assert mock_post.call_count == 4 # Initial + 3 retries

@pytest.mark.asyncio
@patch("app.integrations.llm.openrouter.OpenRouterProvider._execute_with_retry")
async def test_analyze_oversized_response(mock_execute, provider):
    # Mock returning >10,000 chars
    mock_execute.return_value = {"choices": [{"message": {"content": "a" * 10001}}]}
    
    with pytest.raises(RuntimeError, match="Model response exceeded size limits"):
        await provider.analyze_submission("prompt", "sys")

@pytest.mark.asyncio
@patch("app.integrations.llm.openrouter.OpenRouterProvider._execute_with_retry")
async def test_generate_chat_oversized_response(mock_execute, provider):
    mock_execute.return_value = {"choices": [{"message": {"content": "a" * 10001}}]}
    
    with pytest.raises(RuntimeError, match="Model response exceeded size limits"):
        await provider.generate_chat_response([{"role": "user", "content": "hi"}], "sys")
