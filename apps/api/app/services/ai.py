"""
AI utilities for prompt enhancement and analysis.
"""

import json
import os
from typing import Optional

from anthropic import AsyncAnthropic

from app.config import settings


def get_api_key() -> str:
    """Get API key from environment or settings."""
    api_key = os.environ.get("ANTHROPIC_API_KEY", "") or settings.anthropic_api_key
    return api_key.strip() if api_key else ""


class PromptEnhancer:
    """
    Enhances short Twitter prompts into detailed build specifications.
    """
    
    def __init__(self):
        api_key = get_api_key()
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY is not configured")
        self.client = AsyncAnthropic(api_key=api_key)
    
    async def enhance(self, short_prompt: str) -> dict:
        """
        Take a short tweet-style prompt and expand it into detailed specs.
        
        Example:
            Input: "videogame news site with rss"
            Output: {
                "enhanced_prompt": "A video game news aggregator that...",
                "features": ["RSS feed integration", "Dark mode", ...],
                "suggested_template": "static-site",
                "complexity": "medium"
            }
        """
        response = await self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[
                {
                    "role": "user",
                    "content": f"""Analyze this short app request and expand it into detailed specifications:

"{short_prompt}"

Respond with ONLY a JSON object (no markdown):
{{
    "enhanced_prompt": "Detailed description of what to build, including UI/UX considerations",
    "features": ["list", "of", "specific", "features", "to implement"],
    "suggested_template": "static-site|react-app|dashboard|api-backend",
    "complexity": "simple|medium|complex",
    "estimated_files": 3,
    "potential_apis": ["any external APIs that might be useful"],
    "design_suggestions": ["specific design recommendations"]
}}""",
                }
            ],
        )
        
        try:
            text = response.content[0].text.strip()
            # Handle potential markdown wrapping
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text)
        except (json.JSONDecodeError, IndexError):
            return {
                "enhanced_prompt": short_prompt,
                "features": [],
                "suggested_template": "static-site",
                "complexity": "simple",
                "estimated_files": 3,
                "potential_apis": [],
                "design_suggestions": [],
            }
    
    async def analyze_refinement(
        self,
        original_prompt: str,
        refinement_request: str,
        current_files: dict,
    ) -> dict:
        """
        Analyze a refinement request to understand what changes are needed.
        """
        files_summary = ", ".join(current_files.keys())
        
        response = await self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            messages=[
                {
                    "role": "user",
                    "content": f"""Analyze this refinement request for an existing project:

ORIGINAL PROJECT: {original_prompt}
CURRENT FILES: {files_summary}
REFINEMENT REQUEST: {refinement_request}

Respond with ONLY a JSON object:
{{
    "change_type": "minor|major|rebuild",
    "affected_files": ["list of files that need changes"],
    "specific_changes": ["list of specific modifications to make"],
    "requires_new_files": false,
    "estimated_effort": "small|medium|large"
}}""",
                }
            ],
        )
        
        try:
            text = response.content[0].text.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text)
        except (json.JSONDecodeError, IndexError):
            return {
                "change_type": "major",
                "affected_files": list(current_files.keys()),
                "specific_changes": [refinement_request],
                "requires_new_files": False,
                "estimated_effort": "medium",
            }


class ContentModerator:
    """
    Moderate content to prevent abuse and inappropriate projects.
    """
    
    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    
    async def check_prompt(self, prompt: str) -> dict:
        """
        Check if a prompt is appropriate for building.
        
        Returns:
            {
                "allowed": True/False,
                "reason": "Why it was rejected (if rejected)",
                "risk_level": "low|medium|high"
            }
        """
        response = await self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=200,
            messages=[
                {
                    "role": "user",
                    "content": f"""Evaluate if this app request is appropriate to build. Reject requests for:
- Malicious tools (phishing, malware, scrapers for abuse)
- Illegal content
- Harassment or hate speech tools
- Adult/NSFW content
- Impersonation or fraud tools

Request: "{prompt}"

Respond with ONLY JSON:
{{
    "allowed": true,
    "reason": null,
    "risk_level": "low"
}}

OR if rejected:
{{
    "allowed": false,
    "reason": "Brief explanation",
    "risk_level": "high"
}}""",
                }
            ],
        )
        
        try:
            text = response.content[0].text.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text)
        except (json.JSONDecodeError, IndexError):
            # Default to allowing on parse error
            return {
                "allowed": True,
                "reason": None,
                "risk_level": "low",
            }


