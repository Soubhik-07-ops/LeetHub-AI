import json
import logging
from typing import Dict, Any, Optional
from uuid import UUID
from pydantic import ValidationError

from app.integrations.supabase.client import get_supabase_client
from app.integrations.llm.openrouter import OpenRouterProvider
from app.schemas.ai_coach import AIAnalysisResult
from app.services.intelligence_service import intelligence_service

logger = logging.getLogger(__name__)

class AICoachService:
    def __init__(self):
        self.provider = OpenRouterProvider()
        self.prompt_version = "v1.5-openrouter-json"

    async def analyze_submission(self, user_id: str, submission_id: str) -> Dict[str, Any]:
        client = get_supabase_client()
        
        # 1. Verify Ownership & Fetch Source Code
        try:
            sub_res = client.from_("submissions").select("*").eq("id", submission_id).eq("user_id", user_id).single().execute()
            if not sub_res.data:
                raise ValueError("Submission not found or access denied.")
            submission = sub_res.data
        except Exception as e:
            logger.error(f"Error fetching submission: {e}")
            raise ValueError("Submission not found or access denied.")
            
        # 2. Check if analysis already exists for this prompt version
        try:
            existing = client.from_("ai_analyses").select("*").eq("submission_id", submission_id).eq("prompt_version", self.prompt_version).execute()
            if existing.data and len(existing.data) > 0:
                logger.info("Returning cached AI analysis.")
                return existing.data[0]["analysis_json"]
        except Exception as e:
            logger.error(f"Error checking existing analysis: {e}")
            
        # 3. Fetch context (Weaknesses & Trends)
        try:
            topics_data = intelligence_service.get_topic_intelligence(user_id)
            weak_topics = [t["topic"] for t in topics_data.get("topics", []) if t.get("strength") == "weak"]
            weakness_context = ", ".join(weak_topics) if weak_topics else "None identified yet."
        except Exception:
            weakness_context = "Unknown"
            
        # 4. Build Prompts
        system_prompt = (
            "You are an expert AI Developer Coach. You analyze LeetCode submissions for time/space complexity, "
            "code quality, and logical mistakes. "
            f"The user is currently weak in these topics: {weakness_context}. "
            "CRITICAL RULES:\n"
            "1. You will be provided with the submission 'Status'. If the status is NOT 'Accepted' "
            "(e.g., 'Wrong Answer', 'Time Limit Exceeded', 'Runtime Error'), you MUST find the bug or inefficiency "
            "that caused the failure and include it as a 'high' severity mistake in your analysis. Do NOT give positive "
            "overall feedback for a failing solution.\n"
            "2. If the status IS 'Accepted', the code is already correct. Do NOT invent logic bugs. "
            "You may point out minor style issues as 'low' severity, but if the code is good, the 'mistakes' array MUST be empty [].\n"
            "3. If you do include mistakes, EACH mistake object MUST have exactly these three fields: "
            "'description' (string), 'severity' (string: 'low', 'medium', or 'high'), and 'suggestion' (string).\n"
            "IMPORTANT: Your entire response MUST be a valid JSON object matching this schema exactly:\n"
            "{\n"
            '  "time_complexity": "O(N)",\n'
            '  "space_complexity": "O(1)",\n'
            '  "overall_quality": "Good use of sliding window.",\n'
            '  "mistakes": [],\n'
            '  "hints": ["Consider using a hash map to reduce time complexity"]\n'
            "}\n"
            "Do not include any other text, markdown, or explanations outside the JSON."
        )
        
        prompt = (
            f"Problem: {submission['problem_title']}\n"
            f"SUBMISSION STATUS: {submission['status'].upper()} (THIS IS THE SOURCE OF TRUTH. IF THIS IS NOT 'ACCEPTED', THE CODE IS BROKEN OR INEFFICIENT)\n"
            f"Code:\n{submission['source_code']}"
        )
        
        # 5. Call LLM
        raw_json = await self.provider.analyze_submission(prompt, system_prompt)
        
        # 6. Validate Output
        try:
            validated_result = AIAnalysisResult(**raw_json)
        except ValidationError as e:
            logger.error(f"LLM returned invalid JSON schema: {e}")
            raise RuntimeError("LLM returned an invalid schema. Please try again.")
            
        # 7. Persist Result
        try:
            analysis_record = {
                "user_id": user_id,
                "submission_id": submission_id,
                "provider": "OpenRouter",
                "model": self.provider.model,
                "prompt_version": self.prompt_version,
                "analysis_json": validated_result.model_dump()
            }
            client.from_("ai_analyses").insert(analysis_record).execute()
        except Exception as e:
            logger.error(f"Error saving AI analysis to database: {e}")
            
        return validated_result.model_dump()

    async def chat(self, user_id: str, message: str, conversation_id: Optional[str] = None, submission_id: Optional[str] = None) -> Dict[str, Any]:
        client = get_supabase_client()
        
        # 1. Resolve Conversation
        if not conversation_id:
            conv_res = client.from_("ai_conversations").insert({"user_id": user_id}).execute()
            conversation_id = conv_res.data[0]["id"]
        else:
            # Verify ownership
            conv_res = client.from_("ai_conversations").select("*").eq("id", conversation_id).eq("user_id", user_id).execute()
            if not conv_res.data:
                raise ValueError("Conversation not found or access denied.")
                
        # 2. Append User Message
        client.from_("ai_messages").insert({
            "conversation_id": conversation_id,
            "role": "user",
            "content": message
        }).execute()
        
        # 3. Get History
        history_res = client.from_("ai_messages").select("role, content").eq("conversation_id", conversation_id).order("created_at", desc=True).limit(10).execute()
        history = history_res.data[::-1] if history_res.data else []
        
        # 4. Fetch Context
        try:
            topics_data = intelligence_service.get_topic_intelligence(user_id)
            weak_topics = [t["topic"] for t in topics_data.get("topics", []) if t.get("strength") == "weak"]
            weakness_context = ", ".join(weak_topics) if weak_topics else "None identified yet."
        except Exception:
            weakness_context = "Unknown"
            
        system_prompt = (
            "You are a helpful and concise AI Developer Coach. You help users understand data structures, "
            "algorithms, and their own coding patterns. "
            f"The user is currently struggling with: {weakness_context}. "
            "Provide brief, actionable advice. Format your responses with markdown.\n"
            "CRITICAL RULE: DO NOT output any metadata, safety classifications, or system prefixes (e.g., 'User Safety: safe'). "
            "Just directly answer the user's coding question."
        )
        
        if submission_id:
            try:
                sub_res = client.from_("submissions").select("*").eq("id", submission_id).eq("user_id", user_id).single().execute()
                if sub_res.data:
                    lang = sub_res.data.get('language', 'Unknown')
                    system_prompt += (
                        f"\n\nContext regarding the user's current submission they might ask about:\n"
                        f"Problem: {sub_res.data['problem_title']}\n"
                        f"Language: {lang}\n"
                        f"Status: {sub_res.data['status']}\n"
                        f"Code:\n{sub_res.data['source_code']}\n\n"
                        f"CRITICAL RULE: When providing code examples or corrections, you MUST write them in {lang}, "
                        f"matching the language of the user's submission, unless they explicitly request a different language."
                    )
            except Exception as e:
                logger.error(f"Failed to fetch submission for chat context: {e}")
        
        # 5. Call LLM
        response_content = await self.provider.generate_chat_response(history, system_prompt)
        
        # 6. Append Assistant Message
        client.from_("ai_messages").insert({
            "conversation_id": conversation_id,
            "role": "assistant",
            "content": response_content
        }).execute()
        
        return {
            "conversation_id": conversation_id,
            "message": {
                "role": "assistant",
                "content": response_content
            }
        }

ai_coach_service = AICoachService()
