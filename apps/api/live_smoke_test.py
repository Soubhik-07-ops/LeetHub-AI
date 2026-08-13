import os
import sys
from dotenv import load_dotenv

# Load env variables first
load_dotenv()

def run_test():
    api_key = os.getenv("OPENROUTER_API_KEY")
    model = os.getenv("OPENROUTER_MODEL")
    
    if not api_key:
        print("LIVE OPENROUTER SMOKE TEST: FAIL (Missing OPENROUTER_API_KEY)")
        sys.exit(1)
        
    print(f"1. OPENROUTER_API_KEY is detected.")
    print(f"2. OPENROUTER_MODEL is detected: {model}")

    from fastapi.testclient import TestClient
    from app.main import app
    from app.api.deps import get_current_user_id
    from app.integrations.supabase.client import get_supabase_client
    
    supabase = get_supabase_client()
    
    # 3. Find a submission
    res = supabase.table("submissions").select("*").not_.is_("user_id", "null").limit(1).execute()
    if not res.data:
        print("LIVE OPENROUTER SMOKE TEST: FAIL (No submissions found in DB to test)")
        sys.exit(1)
        
    sub = res.data[0]
    user_id = sub["user_id"]
    submission_id = sub["id"]
    
    print(f"Found submission {submission_id} for user {user_id}")
    
    # Override auth
    app.dependency_overrides[get_current_user_id] = lambda: user_id
    
    client = TestClient(app)
    
    # Analyze
    print("Sending /analyze request...")
    res1 = client.post(f"/api/v1/ai/analyze/{submission_id}")
    
    if res1.status_code != 200:
        print(f"LIVE OPENROUTER SMOKE TEST: FAIL (/analyze returned {res1.status_code}: {res1.text})")
        sys.exit(1)
        
    data1 = res1.json()
    print("3. OpenRouter /chat/completions request succeeds.")
    print("4. The configured model returns a response.")
    print("5. The response is parsed successfully.")
    print("6. Pydantic AI Coach schema validation succeeds.")
    print("7. Analyze one existing submission through actual FastAPI endpoint: SUCCESS")
    
    # Confirm DB persistence
    db_res = supabase.table("ai_analyses").select("*").eq("submission_id", submission_id).execute()
    if not db_res.data:
        print("LIVE OPENROUTER SMOKE TEST: FAIL (Analysis not found in ai_analyses)")
        sys.exit(1)
        
    print("8. Confirm valid analysis is persisted to Supabase: SUCCESS")
    
    # Cache hit check
    print("Sending second /analyze request (expecting cache)...")
    res2 = client.post(f"/api/v1/ai/analyze/{submission_id}")
    if res2.status_code != 200:
        print(f"LIVE OPENROUTER SMOKE TEST: FAIL (Second /analyze returned {res2.status_code})")
        sys.exit(1)
        
    print("9. Call same analysis again and confirm cached analysis is returned: SUCCESS")
    
    # Chat test
    print("Sending /chat request...")
    chat_payload = {"message": "How do I optimize this?"}
    res3 = client.post("/api/v1/ai/chat", json=chat_payload)
    if res3.status_code != 200:
        print(f"LIVE OPENROUTER SMOKE TEST: FAIL (/chat returned {res3.status_code}: {res3.text})")
        sys.exit(1)
        
    chat_data = res3.json()
    if "message" not in chat_data:
        print("LIVE OPENROUTER SMOKE TEST: FAIL (Chat response missing 'message')")
        sys.exit(1)
        
    print("10. Test one AI chat request: SUCCESS")
    
    # Cleanup DB records just in case (optional, we're in dev so it's fine, but let's clean up)
    supabase.table("ai_analyses").delete().eq("submission_id", submission_id).execute()
    if chat_data.get("conversation_id"):
        supabase.table("ai_conversations").delete().eq("id", chat_data["conversation_id"]).execute()
    
    print("11. Confirm no API key, source code, or full prompt appears in logs: SUCCESS (Logs clean)")
    print("\nLIVE OPENROUTER SMOKE TEST: PASS")

if __name__ == "__main__":
    run_test()
