import httpx
import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('d:/LeetHub-AI/apps/api/.env')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

async def main():
    api_url = "http://localhost:8000/api/v1/leetcode/submissions"
    
    print("================ LIVE TEST 1 - ACCEPTED ================")
    payload_accepted = {
        "submissionId": "live-test-accepted-1",
        "problemSlug": "two-sum",
        "problemTitle": "Two Sum",
        "status": "accepted",
        "source": "leetcode",
        "submittedAt": "2026-08-10T20:00:00Z",
        "sourceCode": "class Solution: pass",
        "language": "python3"
    }
    
    async with httpx.AsyncClient() as client:
        r = await client.post(api_url, json=payload_accepted)
        print(f"Accepted Request Status: {r.status_code}")
        
    res = supabase.table("submissions").select("*").eq("leetcode_submission_id", "live-test-accepted-1").execute()
    print(f"Supabase Rows for accepted-1: {len(res.data)}")
    if len(res.data) > 0:
        print(f"Status in DB: {res.data[0]['status']}")

    print("\n================ LIVE TEST 2 - REJECTED ================")
    payload_rejected = {
        "submissionId": "live-test-rejected-1",
        "problemSlug": "two-sum",
        "problemTitle": "Two Sum",
        "status": "rejected",
        "source": "leetcode",
        "submittedAt": "2026-08-10T20:05:00Z",
        "sourceCode": "class Solution: return []",
        "language": "python3"
    }
    async with httpx.AsyncClient() as client:
        r = await client.post(api_url, json=payload_rejected)
        print(f"Rejected Request Status: {r.status_code}")
        
    res = supabase.table("submissions").select("*").eq("leetcode_submission_id", "live-test-rejected-1").execute()
    print(f"Supabase Rows for rejected-1: {len(res.data)}")
    if len(res.data) > 0:
        print(f"Status in DB: {res.data[0]['status']}")

    print("\n================ LIVE TEST 3 - REVERSE ACCEPTED ================")
    payload_reverse = {
        "submissionId": "live-test-reverse-1",
        "problemSlug": "two-sum",
        "problemTitle": "Two Sum",
        "status": "accepted",
        "source": "leetcode",
        "submittedAt": "2026-08-10T20:10:00Z",
        "sourceCode": "class Solution: return [0, 1]",
        "language": "python3"
    }
    async with httpx.AsyncClient() as client:
        r = await client.post(api_url, json=payload_reverse)
        print(f"Reverse Accepted Request Status: {r.status_code}")
        
    res = supabase.table("submissions").select("*").eq("leetcode_submission_id", "live-test-reverse-1").execute()
    print(f"Supabase Rows for reverse-1: {len(res.data)}")
    if len(res.data) > 0:
        print(f"Status in DB: {res.data[0]['status']}")

    print("\n================ DUPLICATE TEST ================")
    async with httpx.AsyncClient() as client:
        r = await client.post(api_url, json=payload_reverse)
        print(f"Duplicate Request Status: {r.status_code}")
        
    res = supabase.table("submissions").select("*").eq("leetcode_submission_id", "live-test-reverse-1").execute()
    print(f"Supabase Rows for reverse-1 after duplicate: {len(res.data)}")

    # Cleanup
    supabase.table("submissions").delete().in_("leetcode_submission_id", ["live-test-accepted-1", "live-test-rejected-1", "live-test-reverse-1"]).execute()

if __name__ == "__main__":
    asyncio.run(main())
