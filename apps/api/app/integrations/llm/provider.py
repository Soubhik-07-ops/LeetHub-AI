from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseLLMProvider(ABC):
    @abstractmethod
    async def analyze_submission(self, prompt: str, system_prompt: str) -> Dict[str, Any]:
        """
        Analyzes a submission and returns a structured JSON dictionary
        matching the AIAnalysisResult schema.
        """
        pass
    
    @abstractmethod
    async def generate_chat_response(self, conversation: list[dict], system_prompt: str) -> str:
        """
        Generates a chat response based on conversation history.
        """
        pass
