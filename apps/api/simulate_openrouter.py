import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def main():
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        print("MISSING: OPENROUTER_API_KEY is not configured in .env.")
        print("Please configure OPENROUTER_API_KEY to run live OpenRouter manual tests.")
        return

    from app.integrations.llm.openrouter import OpenRouterProvider
    provider = OpenRouterProvider()
    
    print("Testing OpenRouter Analysis...")
    try:
        res = await provider.analyze_submission(
            prompt="def twoSum(): pass", 
            system_prompt="Return a JSON object with 'time_complexity', 'space_complexity', 'overall_quality', 'mistakes', 'hints'."
        )
        print("Success! Parsed JSON:", res)
    except Exception as e:
        print("Analysis Failed:", e)

    print("\nTesting OpenRouter Chat...")
    try:
        res2 = await provider.generate_chat_response(
            conversation=[{"role": "user", "content": "How do I optimize Two Sum?"}],
            system_prompt="You are a helpful coding coach."
        )
        print("Success! Chat response length:", len(res2))
        print("Chat response snippet:", res2[:100])
    except Exception as e:
        print("Chat Failed:", e)

if __name__ == "__main__":
    asyncio.run(main())
