import json
import logging
from typing import Dict, Any, Optional
from uuid import UUID
from pydantic import ValidationError

from fastapi import HTTPException
from app.integrations.supabase.client import get_supabase_client
from app.integrations.llm.openrouter import OpenRouterProvider
from app.integrations.llm.nvidia import NvidiaProvider
from app.schemas.ai_coach import AIAnalysisResult
from app.services.intelligence_service import intelligence_service
from app.services.ai_usage_service import ai_usage_service

logger = logging.getLogger(__name__)

class AICoachService:
    def __init__(self):
        self.providers = {
            "openrouter": OpenRouterProvider(),
            "nvidia": NvidiaProvider()
        }
        self.prompt_version = "v1.5-openrouter-json"

    async def analyze_submission(self, user_id: str, submission_id: str, force: bool = False) -> Dict[str, Any]:
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

        # 2. Compute Input Hash & Check Cache
        provider_name_expected, expected_model = ai_usage_service.get_expected_provider_and_model(user_id)

        import hashlib
        import datetime

        raw_hash = f"{user_id}:{submission.get('problem_title', '')}:{submission.get('source_code', '')}:{submission.get('language', '')}:{self.prompt_version}:{expected_model}"
        input_hash = hashlib.sha256(raw_hash.encode()).hexdigest()

        if not force:
            try:
                fifteen_mins_ago = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=15)).isoformat()
                existing = client.from_("ai_analyses") \
                    .select("*") \
                    .eq("input_hash", input_hash) \
                    .gte("created_at", fifteen_mins_ago) \
                    .order("created_at", desc=True) \
                    .limit(1) \
                    .execute()

                if existing.data and len(existing.data) > 0:
                    logger.info("Returning cached AI analysis (hit).")
                    result = existing.data[0]["analysis_json"]
                    result["is_cached"] = True
                    return result
            except Exception as e:
                logger.error(f"Error checking existing analysis cache: {e}")

        # 3. Fetch context (Weaknesses & Trends)
        try:
            topics_data = intelligence_service.get_topic_intelligence(user_id)
            weak_topics = [t["topic"] for t in topics_data.get("topics", []) if t.get("strength") == "weak"]
            weakness_context = ", ".join(weak_topics) if weak_topics else "None identified yet."
        except Exception:
            weakness_context = "Unknown"

        # 3.5 Reserve Quota
        is_allowed, usage_id, model, provider_name = ai_usage_service.reserve_quota(user_id, "analysis")
        if not is_allowed:
            raise HTTPException(status_code=429, detail="AI analysis limit reached for your current plan.")

        provider = self.providers.get(provider_name, self.providers["openrouter"])

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
        try:
            raw_json = await provider.analyze_submission(prompt, system_prompt, model)
        except Exception as e:
            ai_usage_service.finalize_usage(usage_id, "failed")
            raise e

        ai_usage_service.finalize_usage(usage_id, "completed")

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
                "provider": provider_name or "OpenRouter",
                "model": model,
                "prompt_version": self.prompt_version,
                "analysis_json": validated_result.model_dump(),
                "input_hash": input_hash
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

        # 4.5 Reserve Quota
        is_allowed, usage_id, model, provider_name = ai_usage_service.reserve_quota(user_id, "chat")
        if not is_allowed:
            raise HTTPException(status_code=429, detail="AI chat limit reached for your current plan.")

        provider = self.providers.get(provider_name, self.providers["openrouter"])

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
        try:
            response_content = await provider.generate_chat_response(history, system_prompt, model)
        except Exception as e:
            ai_usage_service.finalize_usage(usage_id, "failed")
            raise e

        ai_usage_service.finalize_usage(usage_id, "completed")

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
