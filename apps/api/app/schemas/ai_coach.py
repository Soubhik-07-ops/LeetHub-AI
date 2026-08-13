from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID

class Mistake(BaseModel):
    description: str = Field(..., description="A short description of the logical or syntax mistake made by the user.")
    severity: str = Field(..., description="Severity of the mistake (low, medium, high).")
    suggestion: str = Field(..., description="How to fix or avoid this mistake.")

class AIAnalysisResult(BaseModel):
    time_complexity: str = Field(..., description="The time complexity of the user's code (e.g., O(N), O(N^2)).")
    space_complexity: str = Field(..., description="The space complexity of the user's code.")
    overall_quality: str = Field(..., description="A short sentence evaluating the overall code quality.")
    mistakes: List[Mistake] = Field(default_factory=list, description="List of identified mistakes or inefficiencies.")
    hints: List[str] = Field(default_factory=list, description="Helpful hints for solving or optimizing the problem.")

class AIAnalysisRecord(BaseModel):
    id: UUID
    user_id: UUID
    submission_id: UUID
    provider: str
    model: str
    prompt_version: str
    analysis_json: AIAnalysisResult
    created_at: datetime

    class Config:
        from_attributes = True

class AIChatMessage(BaseModel):
    role: str = Field(..., description="'user', 'assistant', or 'system'")
    content: str

class AIChatRequest(BaseModel):
    conversation_id: Optional[UUID] = None
    submission_id: Optional[UUID] = None
    message: str = Field(..., min_length=1, max_length=1000)

class AIChatResponse(BaseModel):
    conversation_id: UUID
    message: AIChatMessage
