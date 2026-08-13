import os
import re
import json
import httpx
import logging
import asyncio
from typing import Dict, Any
from app.integrations.llm.provider import BaseLLMProvider
from app.core.config import settings

logger = logging.getLogger(__name__)

class OpenRouterProvider(BaseLLMProvider):
    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.api_url = settings.OPENROUTER_BASE_URL
        if not self.api_url.endswith("/chat/completions"):
            self.api_url = self.api_url.rstrip("/") + "/chat/completions"
        self.model = settings.OPENROUTER_MODEL
        
        self.headers = {
            "Authorization": f"Bearer {self.api_key}" if self.api_key else "",
            "Content-Type": "application/json",
        }
        
        if settings.FRONTEND_URL:
            self.headers["HTTP-Referer"] = settings.FRONTEND_URL
        if settings.PROJECT_NAME:
            self.headers["X-Title"] = settings.PROJECT_NAME

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """
        Robust JSON extraction handling markdown blocks and raw text.
        """
        # Try to find markdown json block
        md_match = re.search(r'```(?:json)?(.*?)```', text, re.DOTALL)
        if md_match:
            try:
                return json.loads(md_match.group(1).strip())
            except json.JSONDecodeError:
                pass
                
        # Last resort: Try to find anything that looks like a JSON object
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
        
        for attempt in range(max_attempts):
            try:
                async with httpx.AsyncClient(timeout=45.0) as client:
                    response = await client.post(self.api_url, headers=self.headers, json=payload)
                    response.raise_for_status()
                    return response.json()
                    
            except httpx.HTTPStatusError as e:
                status_code = e.response.status_code
                if status_code in (429, 500, 502, 503, 504) and attempt < max_attempts - 1:
                    logger.warning(f"OpenRouter transient error {status_code}, retrying in {delays[attempt]}s")
                    await asyncio.sleep(delays[attempt])
                else:
                    logger.error(f"OpenRouter provider failed (status: {status_code})")
                    raise RuntimeError(f"AI Provider unavailable (status {status_code})")
            except httpx.RequestError as e:
                if attempt < max_attempts - 1:
                    logger.warning(f"OpenRouter connection error, retrying in {delays[attempt]}s")
                    await asyncio.sleep(delays[attempt])
                else:
                    logger.error(f"OpenRouter connection failed")
                    raise RuntimeError("AI Provider connection failed")
        
        raise RuntimeError("AI Provider unavailable")

    async def analyze_submission(self, prompt: str, system_prompt: str) -> Dict[str, Any]:
        if not self.api_key:
            logger.warning("OPENROUTER_API_KEY is missing. Raising error.")
            raise RuntimeError("AI Provider configuration is missing")
            
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"{prompt}\n\nPlease format your response EXACTLY as the requested JSON object."}
        ]
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.1,
            "response_format": {"type": "json_object"}
        }
        
        result = await self._execute_with_retry(payload)
        
        choices = result.get("choices", [])
        if not choices:
            raise RuntimeError("Unexpected response format from OpenRouter API")
            
        generated_text = choices[0].get("message", {}).get("content", "")
        if not generated_text:
            raise RuntimeError("Empty response from OpenRouter API")
            
        if len(generated_text) > 10000:
            raise RuntimeError("Model response exceeded size limits")
            
        return self._extract_json(generated_text)
                
    async def generate_chat_response(self, conversation: list[dict], system_prompt: str) -> str:
        if not self.api_key:
            raise RuntimeError("AI Provider configuration is missing")
            
        messages = [{"role": "system", "content": system_prompt}]
        for msg in conversation:
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.7
        }
        
        result = await self._execute_with_retry(payload)
        
        choices = result.get("choices", [])
        if not choices:
            return "Sorry, I could not generate a response."
            
        generated_text = choices[0].get("message", {}).get("content", "")
        
        if len(generated_text) > 10000:
            raise RuntimeError("Model response exceeded size limits")
            
        return generated_text.strip()
