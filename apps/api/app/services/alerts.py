"""
Alert service for sending notifications to Discord/Slack.
Get notified when builds fail, errors occur, or notable events happen.
"""

from datetime import datetime
from typing import Optional

import httpx

from app.config import settings


class AlertService:
    """Send alerts to Discord or Slack webhooks."""
    
    # Severity colors for Discord embeds
    COLORS = {
        "error": 15158332,      # Red
        "warning": 16776960,    # Yellow
        "info": 3447003,        # Blue
        "success": 3066993,     # Green
    }
    
    # Emojis for different severities
    EMOJIS = {
        "error": "🚨",
        "warning": "⚠️",
        "info": "ℹ️",
        "success": "✅",
    }
    
    def __init__(self):
        self.discord_url = getattr(settings, "discord_webhook_url", None)
        self.slack_url = getattr(settings, "slack_webhook_url", None)
    
    async def send(
        self,
        title: str,
        message: str,
        severity: str = "info",
        fields: Optional[dict] = None,
    ):
        """
        Send an alert to configured webhooks.
        
        Args:
            title: Alert title
            message: Alert body
            severity: One of "error", "warning", "info", "success"
            fields: Optional dict of additional fields to display
        """
        if self.discord_url:
            await self._send_discord(title, message, severity, fields)
        
        if self.slack_url:
            await self._send_slack(title, message, severity, fields)
    
    async def _send_discord(
        self,
        title: str,
        message: str,
        severity: str,
        fields: Optional[dict],
    ):
        """Send alert to Discord webhook."""
        emoji = self.EMOJIS.get(severity, "")
        color = self.COLORS.get(severity, self.COLORS["info"])
        
        embed = {
            "title": f"{emoji} {title}",
            "description": message,
            "color": color,
            "timestamp": datetime.utcnow().isoformat(),
            "footer": {"text": "HeyClaude Alerts"},
        }
        
        if fields:
            embed["fields"] = [
                {"name": k, "value": str(v), "inline": True}
                for k, v in fields.items()
            ]
        
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    self.discord_url,
                    json={"embeds": [embed]},
                    timeout=10.0,
                )
        except Exception as e:
            print(f"Failed to send Discord alert: {e}")
    
    async def _send_slack(
        self,
        title: str,
        message: str,
        severity: str,
        fields: Optional[dict],
    ):
        """Send alert to Slack webhook."""
        emoji = self.EMOJIS.get(severity, "")
        
        blocks = [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": f"{emoji} {title}"}
            },
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": message}
            },
        ]
        
        if fields:
            field_blocks = [
                {"type": "mrkdwn", "text": f"*{k}*\n{v}"}
                for k, v in fields.items()
            ]
            blocks.append({
                "type": "section",
                "fields": field_blocks[:10]  # Slack limit
            })
        
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    self.slack_url,
                    json={"blocks": blocks},
                    timeout=10.0,
                )
        except Exception as e:
            print(f"Failed to send Slack alert: {e}")
    
    # Convenience methods for common alerts
    
    async def build_failed(
        self,
        project_slug: str,
        username: str,
        error: str,
        build_id: str = None,
    ):
        """Alert when a build fails."""
        await self.send(
            title="Build Failed",
            message=f"Build failed for @{username}",
            severity="error",
            fields={
                "Project": project_slug,
                "Error": error[:200],
                "Build ID": build_id or "N/A",
            },
        )
    
    async def moderation_blocked(
        self,
        username: str,
        prompt: str,
        reason: str,
    ):
        """Alert when content moderation blocks a request."""
        await self.send(
            title="Content Blocked",
            message=f"Moderation blocked request from @{username}",
            severity="warning",
            fields={
                "Reason": reason,
                "Prompt": prompt[:200],
            },
        )
    
    async def rate_limit_hit(self, username: str, user_id: str):
        """Alert when a user hits rate limits frequently."""
        await self.send(
            title="Rate Limit Hit",
            message=f"@{username} hit rate limit",
            severity="info",
            fields={
                "User ID": user_id,
            },
        )
    
    async def deployment_error(
        self,
        project_slug: str,
        error: str,
    ):
        """Alert when deployment fails."""
        await self.send(
            title="Deployment Error",
            message=f"Failed to deploy {project_slug}",
            severity="error",
            fields={
                "Project": project_slug,
                "Error": error[:300],
            },
        )
    
    async def system_error(self, error: str, context: str = None):
        """Alert for unexpected system errors."""
        await self.send(
            title="System Error",
            message=error[:500],
            severity="error",
            fields={"Context": context} if context else None,
        )
    
    async def milestone(self, message: str, stats: dict = None):
        """Alert for positive milestones."""
        await self.send(
            title="Milestone Reached! 🎉",
            message=message,
            severity="success",
            fields=stats,
        )


# Singleton
alerts = AlertService()


