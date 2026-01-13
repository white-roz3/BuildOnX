"""
Slug generation utilities.
"""

import re
import random
import string
from slugify import slugify


def generate_slug(text: str, max_length: int = 48) -> str:
    """
    Generate a URL-friendly slug from text.
    
    Args:
        text: The input text to slugify
        max_length: Maximum length of the slug (including random suffix)
    
    Returns:
        A URL-friendly slug like "my-cool-project-x7k2"
    """
    # Extract key words (first few meaningful words)
    words = text.lower().split()
    
    # Remove common words
    stop_words = {
        "a", "an", "the", "make", "me", "create", "build", "with",
        "and", "or", "for", "to", "of", "in", "on", "at", "by",
        "my", "i", "want", "need", "please", "can", "you",
    }
    
    meaningful_words = [w for w in words if w not in stop_words][:4]
    
    if not meaningful_words:
        meaningful_words = words[:2] if words else ["project"]
    
    # Create base slug
    base_text = " ".join(meaningful_words)
    base_slug = slugify(base_text, max_length=max_length - 6)  # Leave room for suffix
    
    # Add random suffix for uniqueness
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
    
    if base_slug:
        return f"{base_slug}-{suffix}"
    else:
        return f"project-{suffix}"


def validate_slug(slug: str) -> bool:
    """
    Validate that a slug is URL-safe.
    
    Args:
        slug: The slug to validate
    
    Returns:
        True if valid, False otherwise
    """
    if not slug or len(slug) < 3 or len(slug) > 64:
        return False
    
    # Only allow lowercase letters, numbers, and hyphens
    pattern = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    return bool(pattern.match(slug))


def sanitize_slug(slug: str) -> str:
    """
    Sanitize a user-provided slug.
    
    Args:
        slug: The slug to sanitize
    
    Returns:
        A sanitized slug
    """
    # Use slugify to clean it up
    clean = slugify(slug, max_length=60)
    
    # Ensure it's not empty
    if not clean:
        clean = generate_slug("custom project")
    
    return clean

