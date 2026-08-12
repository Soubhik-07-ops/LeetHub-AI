import logging
from typing import List, Dict, Any
from app.integrations.supabase.client import get_supabase_client

logger = logging.getLogger(__name__)

class IntelligenceService:
    def get_topic_intelligence(self, user_id: str) -> Dict[str, Any]:
        client = get_supabase_client()
        res = client.rpc('get_topic_stats', {'p_user_id': user_id}).execute()
        
        topics = []
        for row in res.data:
            attempted = row['attempted_problems']
            accepted = row['accepted_problems']
            total_subs = row['total_submissions']
            acc_rate = (accepted / attempted * 100) if attempted > 0 else 0
            
            # Weakness Score calculation
            # High failure rate (100 - acc_rate) is bad
            failure_rate_weight = (100 - acc_rate) * 0.4
            
            # Repetition without acceptance
            repeated_fails = total_subs - accepted
            repetition_weight = min(repeated_fails * 5, 30) # cap at 30
            
            
            # Confidence Calculation
            confidence = "low"
            if attempted >= 10:
                confidence = "high"
            elif attempted >= 3:
                confidence = "medium"
                
            score = failure_rate_weight + repetition_weight
            
            # Classification
            strength = 'stable'
            if score > 40:
                strength = 'weak'
            elif score < 20 and acc_rate > 75:
                strength = 'strong'
                
            topics.append({
                "topic": row['topic'],
                "attempted": attempted,
                "accepted": accepted,
                "acceptance_rate": round(acc_rate, 1),
                "total_submissions": total_subs,
                "strength": strength,
                "weakness_score": round(score, 1),
                "confidence": confidence
            })
            
        return {"topics": topics}

    def get_difficulty_intelligence(self, user_id: str) -> Dict[str, Any]:
        client = get_supabase_client()
        res = client.rpc('get_difficulty_stats', {'p_user_id': user_id}).execute()
        
        difficulties = []
        for row in res.data:
            attempted = row['attempted_problems']
            accepted = row['accepted_problems']
            acc_rate = (accepted / attempted * 100) if attempted > 0 else 0
            difficulties.append({
                "difficulty": row['difficulty'],
                "attempted": attempted,
                "accepted": accepted,
                "acceptance_rate": round(acc_rate, 1),
                "total_submissions": row['total_submissions']
            })
        return {"difficulties": difficulties}

    def get_language_intelligence(self, user_id: str) -> Dict[str, Any]:
        client = get_supabase_client()
        res = client.rpc('get_language_stats', {'p_user_id': user_id}).execute()
        
        languages = []
        for row in res.data:
            attempted = row['attempted_problems']
            accepted = row['accepted_problems']
            acc_rate = (accepted / attempted * 100) if attempted > 0 else 0
            languages.append({
                "language": row['language'],
                "attempted": attempted,
                "accepted": accepted,
                "acceptance_rate": round(acc_rate, 1),
                "total_submissions": row['total_submissions']
            })
        return {"languages": languages}

    def get_contest_intelligence(self, user_id: str) -> Dict[str, Any]:
        client = get_supabase_client()
        res = client.rpc('get_contest_stats', {'p_user_id': user_id}).execute()
        
        contests = []
        for row in res.data:
            attempted = row['attempted_problems']
            accepted = row['accepted_problems']
            acc_rate = (accepted / attempted * 100) if attempted > 0 else 0
            contests.append({
                "contest_type": row['contest_type'],
                "attempted": attempted,
                "accepted": accepted,
                "acceptance_rate": round(acc_rate, 1),
                "total_submissions": row['total_submissions']
            })
        return {"contests": contests}

    def get_activity_heatmap(self, user_id: str) -> Dict[str, Any]:
        client = get_supabase_client()
        res = client.rpc('get_activity_heatmap', {'p_user_id': user_id}).execute()
        return {"heatmap": res.data}

intelligence_service = IntelligenceService()
