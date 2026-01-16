"""
AI-powered code generation service.
Takes natural language prompts and generates complete, deployable projects.
"""

import json
import re
from typing import Optional

from anthropic import AsyncAnthropic

from app.config import settings
from app.services.moderator import moderator
from app.services.alerts import alerts


class BuilderService:
    """
    AI-powered code generation service.
    Takes natural language prompts and generates complete, deployable projects.
    """
    
    def __init__(self):
        api_key = settings.anthropic_api_key
        if not api_key or not api_key.strip():
            raise ValueError("ANTHROPIC_API_KEY is not configured")
        self.client = AsyncAnthropic(api_key=api_key.strip())
        self.model = "claude-sonnet-4-20250514"  # Fast for most builds
        self.model_complex = "claude-opus-4-20250514"  # For complex projects
    
    async def generate_project(
        self,
        prompt: str,
        template_hint: str = "static-site",
        existing_files: Optional[dict] = None,
        refinement_instructions: Optional[str] = None,
        username: str = None,
    ) -> dict:
        """
        Generate a complete project from a natural language prompt.
        
        Returns:
            {
                "name": "Project Name",
                "description": "What it does",
                "files": {"index.html": "...", "style.css": "..."},
                "entry_point": "index.html",
                "tech_stack": {"framework": "vanilla", "features": [...]},
                "refined_prompt": "Enhanced version of original prompt",
                "tokens_used": 1234
            }
        
        Raises:
            ValueError: If prompt or generated code fails moderation
        """
        # CRITICAL: Check prompt before generation
        prompt_check = moderator.check_prompt(prompt)
        if not prompt_check.allowed:
            # Alert on blocked content
            await alerts.moderation_blocked(
                username=username or "unknown",
                prompt=prompt,
                reason=prompt_check.reason,
            )
            raise ValueError(f"Request blocked: {prompt_check.reason}")
        
        system_prompt = self._build_system_prompt(template_hint)
        
        user_message = self._build_user_message(
            prompt=prompt,
            existing_files=existing_files,
            refinement_instructions=refinement_instructions,
        )
        
        # Use complex model for refinements or detected complexity
        model = self.model
        if existing_files or self._is_complex_request(prompt):
            model = self.model_complex
        
        response = await self.client.messages.create(
            model=model,
            max_tokens=8000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        
        # Parse the structured response
        result = self._parse_response(response.content[0].text)
        result["tokens_used"] = response.usage.input_tokens + response.usage.output_tokens
        result["ai_model"] = model
        
        # CRITICAL: Check generated code before returning
        code_check = moderator.check_code(result.get("files", {}))
        if not code_check.allowed:
            await alerts.moderation_blocked(
                username=username or "unknown",
                prompt=prompt,
                reason=f"Generated code blocked: {code_check.reason}",
            )
            raise ValueError(f"Generated code blocked: {code_check.reason}")
        
        return result
    
    def _build_system_prompt(self, template_hint: str) -> str:
        """Build the system prompt based on template type."""
        base_prompt = """You are HeyClaude, an expert full-stack developer that generates complete, deployable web applications from natural language descriptions.

Your goal is to create polished, functional applications that work immediately when deployed.

CRITICAL RULES:
1. Generate COMPLETE, WORKING code - no placeholders, no TODOs, no "implement this"
2. All code must be self-contained - inline CSS/JS for simple projects
3. Use modern, clean design with good UX
4. Include error handling and edge cases
5. Make it actually useful and impressive
6. Use REALISTIC sample data that makes sense for the app

OUTPUT FORMAT:
You MUST respond with a valid JSON object (no markdown, just raw JSON) containing:
{
    "name": "Short catchy project name",
    "description": "One sentence description",
    "refined_prompt": "Your understanding of what to build, enhanced",
    "tech_stack": {
        "type": "static|react|api",
        "features": ["list", "of", "features"]
    },
    "entry_point": "index.html",
    "files": {
        "filename.ext": "complete file contents as string",
        ...
    }
}

DESIGN PRINCIPLES:
- Dark mode by default with excellent contrast
- Clean, modern aesthetic (NOT generic Bootstrap)
- Mobile responsive from the start
- Smooth animations and micro-interactions
- Professional typography (use Google Fonts when appropriate)
- Engaging visual hierarchy
- Intuitive UX patterns"""
        
        template_specifics = {
            "static-site": """

TEMPLATE: Static Site
- Use vanilla HTML/CSS/JS
- Inline styles in <style> tags or single CSS file
- Inline scripts in <script> tags or single JS file
- Must work without any build step
- Include proper meta tags and favicon
- Use CSS custom properties for theming""",
            
            "react-app": """

TEMPLATE: React Application
- Single index.html with React via CDN (react.development.js and react-dom.development.js)
- Use Babel standalone for JSX compilation
- Modern React patterns (hooks, functional components)
- Tailwind CSS via CDN for styling
- Must work without build step
- Include proper state management""",
            
            "dashboard": """

TEMPLATE: Dashboard/Analytics
- Use Chart.js or similar via CDN for visualizations
- Grid-based responsive layout
- Real-time feel with animations
- Mock data that looks completely realistic
- Dark theme optimized for data display
- Interactive filtering and controls""",
            
            "api-backend": """

TEMPLATE: API Backend
- Generate a FastAPI Python application
- Include requirements.txt with pinned versions
- Proper async patterns throughout
- Auto-generated OpenAPI docs
- Include example endpoints and Pydantic models
- Add CORS middleware for frontend access""",
        }
        
        return base_prompt + template_specifics.get(template_hint, template_specifics["static-site"])
    
    def _build_user_message(
        self,
        prompt: str,
        existing_files: Optional[dict],
        refinement_instructions: Optional[str],
    ) -> str:
        """Build the user message for the AI."""
        if existing_files and refinement_instructions:
            # Truncate files if too long
            files_str = json.dumps(existing_files, indent=2)
            if len(files_str) > 15000:
                files_str = files_str[:15000] + "\n... (truncated)"
            
            return f"""EXISTING PROJECT FILES:
{files_str}

ORIGINAL REQUEST: {prompt}

REFINEMENT REQUEST: {refinement_instructions}

Generate the updated project with the refinements applied. Return the complete updated files as JSON."""
        
        return f"""BUILD REQUEST: {prompt}

Generate a complete, deployable project. Remember:
- No placeholders or TODOs anywhere
- Must work immediately when deployed
- Make it actually impressive and useful
- Include realistic sample data/content where appropriate
- Output ONLY valid JSON, no markdown code blocks"""
    
    def _parse_response(self, response_text: str) -> dict:
        """Parse the AI response into structured data."""
        try:
            # Try direct JSON parse first
            return json.loads(response_text.strip())
        except json.JSONDecodeError:
            pass
        
        try:
            # Handle markdown code blocks
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0]
                return json.loads(json_str.strip())
            elif "```" in response_text:
                # Find the first code block
                match = re.search(r"```(?:\w+)?\s*([\s\S]*?)```", response_text)
                if match:
                    return json.loads(match.group(1).strip())
        except (json.JSONDecodeError, IndexError):
            pass
        
        # Last resort: try to find JSON object in text
        try:
            # Find content between first { and last }
            start = response_text.find("{")
            end = response_text.rfind("}") + 1
            if start != -1 and end > start:
                return json.loads(response_text[start:end])
        except json.JSONDecodeError:
            pass
        
        # Fallback: wrap the response as HTML
        return {
            "name": "Generated Project",
            "description": "AI-generated project",
            "files": {"index.html": self._create_fallback_html(response_text)},
            "entry_point": "index.html",
            "tech_stack": {"type": "static", "features": []},
            "refined_prompt": "",
        }
    
    def _create_fallback_html(self, content: str) -> str:
        """Create a fallback HTML page with the content."""
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Project</title>
    <style>
        body {{
            font-family: system-ui, sans-serif;
            background: #0a0a0a;
            color: #fafafa;
            padding: 2rem;
            line-height: 1.6;
        }}
        pre {{
            background: #1a1a1a;
            padding: 1rem;
            border-radius: 8px;
            overflow-x: auto;
        }}
    </style>
</head>
<body>
    <h1>Generated Project</h1>
    <pre>{content}</pre>
</body>
</html>"""
    
    def _is_complex_request(self, prompt: str) -> bool:
        """Detect if a request is complex enough to warrant the larger model."""
        prompt_lower = prompt.lower()
        
        complex_indicators = [
            "integrate", "authentication", "database", "real-time",
            "websocket", "payment", "stripe", "oauth", "api",
            "full-stack", "backend", "multiple pages", "routing",
        ]
        
        complexity_score = sum(1 for ind in complex_indicators if ind in prompt_lower)
        return complexity_score >= 2 or len(prompt) > 500
    
    def detect_template(self, prompt: str) -> str:
        """Detect best template based on prompt keywords."""
        prompt_lower = prompt.lower()
        
        if any(w in prompt_lower for w in ["dashboard", "admin", "analytics", "chart", "metrics"]):
            return "dashboard"
        elif any(w in prompt_lower for w in ["api", "backend", "server", "endpoint", "rest"]):
            return "api-backend"
        elif any(w in prompt_lower for w in ["react", "interactive", "component", "spa", "single page"]):
            return "react-app"
        else:
            return "static-site"

