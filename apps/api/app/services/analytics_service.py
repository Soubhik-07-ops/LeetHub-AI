import logging
from typing import Tuple, List, Dict, Any, Optional
from datetime import datetime, timezone
from app.integrations.supabase.client import get_supabase_client
from app.schemas.analytics import AnalyticsOverviewResponse, ActivityDay, RecentSubmission

logger = logging.getLogger(__name__)

class AnalyticsService:
    def get_overview(self, user_id: Optional[str]) -> AnalyticsOverviewResponse:
        client = get_supabase_client()
        
        # We must select all necessary rows for aggregation since Supabase python client 
        # doesn't natively support advanced SQL grouping/aggregation through PostgREST 
        # as cleanly without raw SQL or RPCs. However, we explicitly exclude source_code.
        query = client.table('submissions').select(
            "id, problem_slug, problem_title, status, submitted_at, github_sync_status"
        )
        
        # User Ownership filtering is strictly required
        if not user_id:
            raise ValueError("user_id is strictly required for analytics")
            
        query = query.eq('user_id', user_id)
            
        res = query.order('submitted_at', desc=True).execute()
        data = res.data
        
        total_submissions = len(data)
        
        # Metrics
        unique_problems_set = set()
        accepted_submissions = 0
        rejected_submissions = 0
        github_synced_count = 0
        github_failed_count = 0
        github_skipped_count = 0
        
        # Activity grouping
        activity_dict = {}
        
        # Recent submissions limit
        recent_submissions_data = data[:20]
        recent_submissions = []
        
        for idx, row in enumerate(data):
            unique_problems_set.add(row['problem_slug'])
            
            status = row['status'].lower()
            if status == 'accepted':
                accepted_submissions += 1
            else:
                rejected_submissions += 1
                
            gh_status = row.get('github_sync_status')
            if gh_status == 'synced':
                github_synced_count += 1
            elif gh_status == 'failed':
                github_failed_count += 1
            else:
                # pending or skipped
                github_skipped_count += 1
                
            # UTC Activity Aggregation
            # submitted_at is ISO format string from postgres, ending with +00:00 or Z
            # Parse to datetime, then format to YYYY-MM-DD
            try:
                dt = datetime.fromisoformat(row['submitted_at'].replace('Z', '+00:00'))
                # Ensure UTC
                dt_utc = dt.astimezone(timezone.utc)
                date_str = dt_utc.strftime('%Y-%m-%d')
                activity_dict[date_str] = activity_dict.get(date_str, 0) + 1
            except Exception as e:
                logger.warning(f"Failed to parse submitted_at: {row['submitted_at']} - {str(e)}")
                
            # Populate recent submissions
            if idx < 20:
                recent_submissions.append(
                    RecentSubmission(
                        problemSlug=row['problem_slug'],
                        problemTitle=row['problem_title'],
                        status=row['status'],
                        submittedAt=row['submitted_at'],
                        githubSyncStatus=gh_status or 'pending'
                    )
                )
                
        acceptance_rate = 0.0
        if total_submissions > 0:
            acceptance_rate = round((accepted_submissions / total_submissions) * 100, 1)
            
        activity_by_day = [
            ActivityDay(date=k, submissions=v) for k, v in sorted(activity_dict.items())
        ]
        
        # Streak Calculation
        current_streak = 0
        longest_streak = 0
        
        if activity_by_day:
            import datetime as dt
            # Parse dates and sort them
            dates = sorted([dt.datetime.strptime(day.date, '%Y-%m-%d').date() for day in activity_by_day])
            
            if dates:
                # Longest streak calculation
                temp_longest = 1
                for i in range(1, len(dates)):
                    if (dates[i] - dates[i-1]).days == 1:
                        temp_longest += 1
                    else:
                        longest_streak = max(longest_streak, temp_longest)
                        temp_longest = 1
                longest_streak = max(longest_streak, temp_longest)
                
                # Current streak calculation
                today = datetime.now(timezone.utc).date()
                if dates[-1] == today:
                    current_streak = 1
                    for i in range(len(dates)-2, -1, -1):
                        if (dates[i+1] - dates[i]).days == 1:
                            current_streak += 1
                        else:
                            break
                elif (today - dates[-1]).days == 1:
                    # They haven't submitted today, but submitted yesterday
                    current_streak = 1
                    for i in range(len(dates)-2, -1, -1):
                        if (dates[i+1] - dates[i]).days == 1:
                            current_streak += 1
                        else:
                            break
                else:
                    current_streak = 0

        return AnalyticsOverviewResponse(
            total_submissions=total_submissions,
            unique_problems=len(unique_problems_set),
            accepted_submissions=accepted_submissions,
            rejected_submissions=rejected_submissions,
            acceptance_rate=acceptance_rate,
            github_synced_count=github_synced_count,
            github_failed_count=github_failed_count,
            github_skipped_count=github_skipped_count,
            current_streak=current_streak,
            longest_streak=longest_streak,
            activity_by_day=activity_by_day,
            recent_submissions=recent_submissions
        )

analytics_service = AnalyticsService()
