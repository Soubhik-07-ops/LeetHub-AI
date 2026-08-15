import json
import re
import logging
import asyncio
import httpx
from typing import Dict, Any
from app.integrations.llm.provider import BaseLLMProvider
from app.core.config import settings

logger = logging.getLogger(__name__)

class NvidiaProvider(BaseLLMProvider):
    def __init__(self):
        self.api_key = settings.NVIDIA_API_KEY
        self.base_url = settings.NVIDIA_BASE_URL
        if not self.base_url.endswith("/chat/completions"):
            self.base_url = self.base_url.rstrip("/") + "/chat/completions"
        
        self.headers = {
            "Authorization": f"Bearer {self.api_key}" if self.api_key else "",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """
        Robust JSON extraction handling markdown blocks and raw text.
        """
        md_match = re.search(r'```(?:json)?(.*?)```', text, re.DOTALL)
        if md_match:
            try:
                return json.loads(md_match.group(1).strip())
            except json.JSONDecodeError:
                pass
                
        obj_match = re.search(r'\{.*\}', text, re.DOTALL)
        if obj_match:
            try:
                return json.loads(obj_match.group(0))
            except json.JSONDecodeError:
                pass
                
        raise RuntimeError("Could not extract valid JSON from LLM response")

    async def _execute_with_retry(self, payload: dict) -> dict:
        delays = [1, 2, 4]
        max_attempts = len(delays) + 1
        
        if not self.api_key:
            logger.warning("NVIDIA_API_KEY is missing. Raising error.")
            raise RuntimeError("AI Provider configuration is missing")
            
        for attempt in range(max_attempts):
            try:
                async with httpx.AsyncClient(timeout=45.0) as client:
                    response = await client.post(self.base_url, headers=self.headers, json=payload)
                    response.raise_for_status()
                    return response.json()
                    
            except httpx.HTTPStatusError as e:
                status_code = e.response.status_code
                if status_code in (429, 500, 502, 503, 504) and attempt < max_attempts - 1:
                    logger.warning(f"NVIDIA transient error {status_code}, retrying in {delays[attempt]}s")
                    await asyncio.sleep(delays[attempt])
                else:
                    logger.error(f"NVIDIA provider failed (status: {status_code})")
                    raise RuntimeError(f"AI Provider unavailable (status {status_code})")
            except httpx.RequestError as e:
                if attempt < max_attempts - 1:
                    logger.warning(f"NVIDIA connection error, retrying in {delays[attempt]}s")
                    await asyncio.sleep(delays[attempt])
                else:
                    logger.error(f"NVIDIA connection failed")
                    raise RuntimeError("AI Provider connection failed")
        
        raise RuntimeError("AI Provider unavailable")

    async def analyze_submission(self, prompt: str, system_prompt: str, model: str) -> Dict[str, Any]:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"{prompt}\n\nPlease format your response EXACTLY as the requested JSON object."}
        ]
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.1,
            "max_tokens": 16384,
            "top_p": 0.95,
            "response_format": {"type": "json_object"},
            "chat_template_kwargs": {
                "enable_thinking": True
            },
            "reasoning_budget": 16384
        }
        
        result = await self._execute_with_retry(payload)
        
        choices = result.get("choices", [])
        if not choices:
            raise RuntimeError("Unexpected response format from NVIDIA API")
            
        generated_text = choices[0].get("message", {}).get("content", "")
        if not generated_text:
            raise RuntimeError("Empty response from NVIDIA API")
            
        if len(generated_text) > 10000:
            raise RuntimeError("Model response exceeded size limits")
            
        return self._extract_json(generated_text)

    async def generate_chat_response(self, conversation: list[dict], system_prompt: str, model: str) -> str:
        messages = [{"role": "system", "content": system_prompt}]
        for msg in conversation:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
            
        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 16384,
            "top_p": 0.95,
            "chat_template_kwargs": {
                "enable_thinking": True
            },
            "reasoning_budget": 16384
        }
        
        result = await self._execute_with_retry(payload)
        
        choices = result.get("choices", [])
        if not choices:
            return "Sorry, I could not generate a response."
            
        generated_text = choices[0].get("message", {}).get("content", "")
        
        if len(generated_text) > 10000:
            raise RuntimeError("Model response exceeded size limits")
            
        return generated_text.strip()

