"""
Open Graph image generation for social sharing.
Generates preview images when projects are shared on social media.
"""

import base64
from io import BytesIO
from typing import Optional

# Try to import PIL, fall back gracefully if not available
try:
    from PIL import Image, ImageDraw, ImageFont
    HAS_PIL = True
except ImportError:
    HAS_PIL = False


class OGImageService:
    """Generate Open Graph images for projects."""
    
    # Image dimensions (Twitter/OpenGraph standard)
    WIDTH = 1200
    HEIGHT = 630
    
    # Colors
    BG_COLOR = "#0a0a0a"
    TEXT_COLOR = "#fafafa"
    MUTED_COLOR = "#888888"
    PRIMARY_COLOR = "#22c55e"
    
    def __init__(self):
        self.has_pil = HAS_PIL
    
    def generate_template(
        self,
        project_name: str,
        description: Optional[str] = None,
        author: Optional[str] = None,
    ) -> bytes:
        """
        Generate an OG image from a template (no screenshot).
        
        Args:
            project_name: Name of the project
            description: Short description
            author: Author's Twitter handle
        
        Returns:
            PNG image as bytes
        """
        if not self.has_pil:
            return self._generate_svg_fallback(project_name, description, author)
        
        # Create image
        img = Image.new("RGB", (self.WIDTH, self.HEIGHT), color=self.BG_COLOR)
        draw = ImageDraw.Draw(img)
        
        # Try to load fonts, fall back to default
        try:
            font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 64)
            font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 32)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
        except (IOError, OSError):
            font_large = ImageFont.load_default()
            font_medium = ImageFont.load_default()
            font_small = ImageFont.load_default()
        
        # Draw background gradient effect (vertical lines)
        for i in range(0, self.WIDTH, 50):
            opacity = int(255 * 0.03)
            draw.line([(i, 0), (i, self.HEIGHT)], fill=(34, 197, 94, opacity), width=1)
        
        # Draw HeyClaude logo area
        draw.rectangle([(40, 40), (56, 56)], fill=self.PRIMARY_COLOR)
        draw.text((70, 38), "HeyClaude", fill=self.TEXT_COLOR, font=font_small)
        
        # Draw project name
        name_y = 220
        # Truncate if too long
        display_name = project_name[:40] + "..." if len(project_name) > 40 else project_name
        draw.text((60, name_y), display_name, fill=self.TEXT_COLOR, font=font_large)
        
        # Draw description
        if description:
            desc_y = name_y + 80
            # Truncate description
            display_desc = description[:100] + "..." if len(description) > 100 else description
            draw.text((60, desc_y), display_desc, fill=self.MUTED_COLOR, font=font_medium)
        
        # Draw author
        if author:
            author_y = self.HEIGHT - 80
            draw.text((60, author_y), f"by {author}", fill=self.MUTED_COLOR, font=font_small)
        
        # Draw "Built with BuildOnX" footer
        footer_y = self.HEIGHT - 50
        draw.text(
            (self.WIDTH - 250, footer_y),
            "Built with HeyClaude",
            fill=self.PRIMARY_COLOR,
            font=font_small,
        )
        
        # Save to bytes
        buffer = BytesIO()
        img.save(buffer, format="PNG", optimize=True)
        return buffer.getvalue()
    
    def _generate_svg_fallback(
        self,
        project_name: str,
        description: Optional[str],
        author: Optional[str],
    ) -> bytes:
        """Generate a simple SVG if PIL is not available."""
        desc_text = description[:80] if description else ""
        author_text = f"by {author}" if author else ""
        
        svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{self.WIDTH}" height="{self.HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="{self.BG_COLOR}"/>
  
  <!-- Grid pattern -->
  <defs>
    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="{self.PRIMARY_COLOR}" stroke-width="0.5" opacity="0.1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid)"/>
  
  <!-- Logo -->
  <rect x="40" y="40" width="16" height="16" fill="{self.PRIMARY_COLOR}"/>
  <text x="70" y="54" fill="{self.TEXT_COLOR}" font-family="system-ui" font-size="20">HeyClaude</text>
  
  <!-- Project name -->
  <text x="60" y="280" fill="{self.TEXT_COLOR}" font-family="system-ui" font-size="56" font-weight="bold">
    {project_name[:35]}
  </text>
  
  <!-- Description -->
  <text x="60" y="350" fill="{self.MUTED_COLOR}" font-family="system-ui" font-size="28">
    {desc_text}
  </text>
  
  <!-- Author -->
  <text x="60" y="{self.HEIGHT - 60}" fill="{self.MUTED_COLOR}" font-family="system-ui" font-size="20">
    {author_text}
  </text>
  
  <!-- Footer -->
  <text x="{self.WIDTH - 220}" y="{self.HEIGHT - 30}" fill="{self.PRIMARY_COLOR}" font-family="system-ui" font-size="18">
    Built with BuildOnX
  </text>
</svg>'''
        
        return svg.encode("utf-8")
    
    def to_base64(self, image_bytes: bytes) -> str:
        """Convert image bytes to base64 data URI."""
        b64 = base64.b64encode(image_bytes).decode("utf-8")
        # Detect format from bytes
        if image_bytes[:4] == b"\x89PNG":
            mime = "image/png"
        elif image_bytes[:5] == b"<?xml":
            mime = "image/svg+xml"
        else:
            mime = "image/png"
        return f"data:{mime};base64,{b64}"


# Singleton
og_image = OGImageService()


async def generate_project_og_image(
    project_name: str,
    description: Optional[str] = None,
    author: Optional[str] = None,
) -> bytes:
    """
    Generate an OG image for a project.
    
    This is async-ready for use in API routes.
    """
    return og_image.generate_template(project_name, description, author)


