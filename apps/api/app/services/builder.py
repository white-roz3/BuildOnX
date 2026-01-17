"""
AI-powered code generation service.
Takes natural language prompts and generates complete, deployable projects.
"""

import json
import os
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
        # Let the SDK pick up ANTHROPIC_API_KEY from environment automatically
        # The SDK will read os.environ["ANTHROPIC_API_KEY"] if api_key is not provided
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable is not set")
        print(f"[BuilderService] API key found: {api_key[:20]}... ({len(api_key)} chars)")
        # Pass the key directly to ensure it's used
        self.client = AsyncAnthropic(api_key=api_key)
        self.model = "claude-3-5-sonnet-20241022"  # Cost-efficient
        self.model_complex = "claude-3-5-sonnet-20241022"  # Same model for consistency
    
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

DESIGN PRINCIPLES - NEOBRUTALIST AESTHETIC (MANDATORY):
You MUST follow this exact design system for EVERY project:

COLOR PALETTE:
- Background: Off-white/cream (#FAF8F5, #F5F3EF) or charcoal (#1A1A1A, #0D0D0D)
- Text: High contrast - pure black (#000000) on light, off-white (#FAFAFA) on dark
- Accent: ONE bold color only - neon green (#BFFF00), electric blue (#0066FF), hot coral (#FF6B35), or bright yellow (#FFE135)
- NO gradients. Flat, solid colors only.

TYPOGRAPHY:
- Headers: Bold geometric sans-serif (Space Grotesk, Satoshi, or Clash Display via Google Fonts)
- Weight: 700-900 for headers, 400-500 for body
- Size: LARGE headers (clamp(2.5rem, 8vw, 6rem)), generous line-height
- Style: ALL CAPS for main headings, mixed case for subheads
- Letter-spacing: Tight for headers (-0.02em to -0.05em)

BORDERS & SHAPES:
- Thick black borders (2-4px solid black) on cards, buttons, inputs
- Sharp corners OR chunky border-radius (0 or 12-16px, nothing in between)
- Offset box shadows: 4px 4px 0 #000 (hard shadow, no blur)
- No subtle shadows - either bold offset or none

LAYOUT:
- Generous whitespace - let elements breathe
- Strong grid structure with clear sections
- Asymmetric layouts encouraged
- Large touch targets (min 48px)
- Mobile responsive from the start

BUTTONS & INTERACTIONS:
- Thick borders, solid fills
- Hover: shift shadow or invert colors
- Active: remove shadow, translate slightly
- Bold, chunky appearance

ANIMATIONS:
- Minimal and functional
- Quick, snappy transitions (150-200ms)
- No bouncy or playful effects
- Subtle hover states only

OVERALL VIBE:
- Raw, honest, unapologetic
- Looks intentionally designed, not accidentally plain
- Bold visual statements
- Professional but with personality
- References: Gumroad, Linear, Vercel's marketing"""
        
        template_specifics = {
            "static-site": """

TEMPLATE: Static Site (NEOBRUTALIST)
- Use vanilla HTML/CSS/JS
- Inline styles in <style> tags
- MUST use neobrutalist design: thick borders, offset shadows, bold typography
- Include Google Fonts: Space Grotesk or Clash Display
- CSS custom properties for the color palette
- Example button style: border: 3px solid #000; box-shadow: 4px 4px 0 #000;
- Example hover: transform: translate(-2px, -2px); box-shadow: 6px 6px 0 #000;""",
            
            "react-app": """

TEMPLATE: React Application (NEOBRUTALIST)
- Single index.html with React via CDN
- Use Babel standalone for JSX
- MUST use neobrutalist design throughout
- Include Google Fonts for bold typography
- All components: thick borders, offset shadows, chunky buttons
- No Tailwind default styles - custom neobrutalist CSS""",
            
            "dashboard": """

TEMPLATE: Dashboard (NEOBRUTALIST)
- Use Chart.js via CDN for visualizations
- NEOBRUTALIST cards with thick black borders
- Offset box shadows on all panels
- Bold headers in Space Grotesk
- High contrast data display
- Chunky tabs and controls with thick borders
- Dark theme: charcoal background, bright accent for highlights""",
            
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

Generate the updated project with the refinements applied. Return the complete updated files as JSON.

MAINTAIN NEOBRUTALIST DESIGN:
- Keep thick borders, offset shadows, bold typography
- Don't add gradients or subtle Bootstrap-style shadows
- Preserve the raw, intentional neobrutalist aesthetic"""
        
        return f"""BUILD REQUEST: {prompt}

Generate a complete, deployable project. Remember:
- No placeholders or TODOs anywhere
- Must work immediately when deployed
- Make it actually impressive and useful
- Include realistic sample data/content where appropriate
- Output ONLY valid JSON, no markdown code blocks

CRITICAL - NEOBRUTALIST DESIGN IS MANDATORY:
- Thick black borders (3px) on all cards/buttons
- Offset box shadows (4px 4px 0 #000)
- Bold geometric typography (Space Grotesk)
- High contrast colors, ONE accent color only
- No gradients, no subtle shadows, no rounded Bootstrap look
- Reference style: Gumroad, Linear, modern agency sites"""
    
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
        """Create a fallback HTML page with neobrutalist styling."""
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Project</title>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: 'Space Grotesk', system-ui, sans-serif;
            background: #FAF8F5;
            color: #0D0D0D;
            padding: 2rem;
            line-height: 1.6;
        }}
        h1 {{
            font-size: 3rem;
            font-weight: 700;
            letter-spacing: -0.03em;
            margin-bottom: 1.5rem;
            text-transform: uppercase;
        }}
        .card {{
            background: #fff;
            border: 3px solid #000;
            box-shadow: 6px 6px 0 #000;
            padding: 1.5rem;
            margin-top: 1rem;
        }}
        pre {{
            background: #1a1a1a;
            color: #fafafa;
            padding: 1.5rem;
            overflow-x: auto;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.875rem;
        }}
    </style>
</head>
<body>
    <h1>Generated Project</h1>
    <div class="card">
        <pre>{content}</pre>
    </div>
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

