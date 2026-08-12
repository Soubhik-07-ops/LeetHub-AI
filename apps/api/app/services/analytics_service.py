import logging
from typing import Tuple, List, Dict, Any, Optional
from datetime import datetime, timezone
from app.integrations.supabase.client import get_supabase_client
from app.schemas.analytics import AnalyticsOverviewResponse, ActivityDay, RecentSubmission, TrendIntelligence

logger = logging.getLogger(__name__)

class AnalyticsService:
    def get_overview(self, user_id: Optional[str]) -> AnalyticsOverviewResponse:
        client = get_supabase_client()
        
        if not user_id:
            raise ValueError("user_id is strictly required for analytics")
            
        # 1. Bounded Recent Submissions (Max 20)
        query = client.table('submissions').select(
            "id, leetcode_submission_id, problem_slug, problem_title, status, submitted_at, github_sync_status"
        ).eq('user_id', user_id).order('submitted_at', desc=True).limit(20)
        
        res = query.execute()
        recent_submissions = []
        for row in res.data:
            recent_submissions.append(
                RecentSubmission(
                    leetcodeSubmissionId=row['leetcode_submission_id'],
                    problemSlug=row['problem_slug'],
                    problemTitle=row['problem_title'],
                    status=row['status'],
                    submittedAt=row['submitted_at'],
                    githubSyncStatus=row.get('github_sync_status') or 'pending'
                )
            )

        # 2. Database-level Aggregation via RPCs
        overview_res = client.rpc('get_overview_stats', {'p_user_id': user_id}).execute()
        streak_res = client.rpc('get_streak_stats', {'p_user_id': user_id}).execute()
        heatmap_res = client.rpc('get_activity_heatmap', {'p_user_id': user_id}).execute()
        trend_res = client.rpc('get_trend_metrics', {'p_user_id': user_id}).execute()
        
        # Parse overview
        o_data = overview_res.data[0] if overview_res.data else {
            'total_submissions': 0, 'unique_problems': 0, 'accepted_submissions': 0,
            'rejected_submissions': 0, 'github_synced_count': 0, 'github_failed_count': 0, 'github_skipped_count': 0
        }
        
        # Parse streaks
        s_data = streak_res.data[0] if streak_res.data else {'current_streak': 0, 'longest_streak': 0}
        
        # Parse heatmap
        activity_by_day = [
            ActivityDay(date=row['activity_date'], submissions=row['submissions']) 
            for row in heatmap_res.data
        ] if heatmap_res.data else []
        
        acceptance_rate = 0.0
        if o_data['total_submissions'] > 0:
            acceptance_rate = round((o_data['accepted_submissions'] / o_data['total_submissions']) * 100, 1)

        # Calculate Trend
        trend_obj = None
        if trend_res.data:
            t = trend_res.data[0]
            r_att, r_acc = t['recent_attempted'], t['recent_accepted']
            p_att, p_acc = t['previous_attempted'], t['previous_accepted']
            
            r_rate = round((r_acc / r_att * 100), 1) if r_att > 0 else 0.0
            p_rate = round((p_acc / p_att * 100), 1) if p_att > 0 else 0.0
            
            rate_delta = round(r_rate - p_rate, 1)
            vol_delta = r_att - p_att
            
            # Classification
            if r_att == 0 and p_att == 0:
                classification = "insufficient data"
                rec = "Submit more problems to establish a baseline."
            elif r_rate > p_rate + 5.0 or (r_rate >= p_rate and vol_delta > 0):
                classification = "improving"
                rec = "Great momentum! You are solving more problems or improving your win rate."
            elif r_rate < p_rate - 5.0:
                classification = "declining"
                rec = "Your acceptance rate has dropped recently. Focus on easier topics."
            else:
                classification = "stable"
                rec = "Consistent performance. Try pushing into harder difficulties."
                
            trend_obj = TrendIntelligence(
                recent_attempted=r_att,
                recent_accepted=r_acc,
                previous_attempted=p_att,
                previous_accepted=p_acc,
                recent_acceptance_rate=r_rate,
                previous_acceptance_rate=p_rate,
                acceptance_rate_delta=rate_delta,
                volume_delta=vol_delta,
                classification=classification,
                recommendation=rec
            )

        return AnalyticsOverviewResponse(
            total_submissions=o_data['total_submissions'],
            unique_problems=o_data['unique_problems'],
            accepted_submissions=o_data['accepted_submissions'],
            rejected_submissions=o_data['rejected_submissions'],
            acceptance_rate=acceptance_rate,
            github_synced_count=o_data['github_synced_count'],
            github_failed_count=o_data['github_failed_count'],
            github_skipped_count=o_data['github_skipped_count'],
            current_streak=s_data['current_streak'],
            longest_streak=s_data['longest_streak'],
            activity_by_day=activity_by_day,
            recent_submissions=recent_submissions,
            trend=trend_obj
        )

analytics_service = AnalyticsService()
