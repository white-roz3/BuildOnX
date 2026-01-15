"""
Content moderation service - CRITICAL for preventing abuse.
Blocks phishing, malware, prompt injection, and other malicious content.
"""

import re
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ModerationResult:
    """Result of content moderation check."""
    allowed: bool
    reason: Optional[str] = None
    flags: list = field(default_factory=list)


class ContentModerator:
    """
    Moderates prompts and generated code to prevent abuse.
    
    This is CRITICAL before launch - without it, attackers can:
    - Generate phishing pages (fake PayPal, Google, bank logins)
    - Host malware/cryptominers
    - Use prompt injection to bypass safety
    - Steal credentials via malicious JS
    """
    
    # Prompt injection patterns - attempts to override AI instructions
    INJECTION_PATTERNS = [
        r"ignore\s+(previous|above|all)\s+(instructions?|prompts?)",
        r"disregard\s+(your|the)\s+(rules|guidelines|instructions)",
        r"you\s+are\s+now\s+",
        r"pretend\s+(you're|you\s+are|to\s+be)",
        r"act\s+as\s+(if|though)",
        r"system\s*:\s*",
        r"<\s*system\s*>",
        r"</?\s*prompt\s*>",
        r"forget\s+(everything|all|your)",
        r"new\s+personality",
        r"jailbreak",
        r"dan\s+mode",
    ]
    
    # Dangerous requests - block entirely
    DANGEROUS_PATTERNS = [
        # Malware
        r"(crypto|bitcoin|monero)\s*(miner|mining)",
        r"keylog(ger|ging)",
        r"ransomware",
        r"malware",
        r"botnet",
        r"reverse\s*shell",
        r"shell\s*code",
        r"exploit\s*(kit|code)",
        
        # Phishing
        r"phishing",
        r"credential\s*(steal|harvest|capture)",
        r"(fake|clone|replica).*(login|signin|sign-in)",
        r"(fake|clone|replica).*(paypal|stripe|venmo|cashapp|zelle)",
        r"(fake|clone|replica).*(google|facebook|instagram|twitter|tiktok)",
        r"(fake|clone|replica).*(bank|chase|wellsfargo|bofa|citi)",
        r"(fake|clone|replica).*(amazon|apple|microsoft)",
        r"password\s*(harvester|stealer|grabber)",
        
        # Fraud
        r"credit\s*card\s*(skimmer|stealer|generator)",
        r"ssn\s*(generator|stealer)",
        r"identity\s*theft",
        
        # Illegal content
        r"(child|cp)\s*(porn|exploitation)",
        r"drug\s*(marketplace|shop|store)",
        r"weapon\s*(shop|store|marketplace)",
    ]
    
    # Patterns to check in generated code
    CODE_PATTERNS = [
        # Cookie/credential theft
        (r"eval\s*\(\s*atob", "Obfuscated code execution"),
        (r"document\.cookie\s*[^;]*(?:fetch|xhr|ajax|send)", "Cookie exfiltration"),
        (r"localStorage.*password", "Password access from storage"),
        (r"navigator\.credentials", "Credential API access"),
        (r"formData.*password.*fetch", "Password form interception"),
        
        # Hidden malicious elements
        (r"<iframe[^>]*(display:\s*none|width:\s*0|height:\s*0)", "Hidden iframe"),
        (r"<script[^>]*src=['\"](?!https?://(cdn|unpkg|cdnjs|jsdelivr))", "External script from unknown source"),
        
        # Crypto mining
        (r"coinhive|cryptoloot|minero|webminer", "Cryptominer detected"),
        (r"wasm.*mine|mine.*wasm", "WebAssembly mining"),
        
        # Data exfiltration
        (r"navigator\.(userAgent|platform).*fetch", "Browser fingerprinting with exfil"),
        (r"new\s+WebSocket.*password", "WebSocket credential leak"),
    ]
    
    # Suspicious but allowed with warning
    WARNING_PATTERNS = [
        r"document\.cookie",
        r"localStorage\.(get|set)Item",
        r"eval\s*\(",
        r"new\s+Function\s*\(",
        r"innerHTML\s*=",
    ]
    
    def check_prompt(self, prompt: str) -> ModerationResult:
        """
        Check if a build prompt is safe.
        
        Args:
            prompt: The user's build request
            
        Returns:
            ModerationResult with allowed=True if safe
        """
        prompt_lower = prompt.lower()
        flags = []
        
        # Check for prompt injection attempts
        for pattern in self.INJECTION_PATTERNS:
            if re.search(pattern, prompt_lower, re.IGNORECASE):
                return ModerationResult(
                    allowed=False,
                    reason="Request contains disallowed patterns",
                    flags=["injection"]
                )
        
        # Check for dangerous content requests
        for pattern in self.DANGEROUS_PATTERNS:
            if re.search(pattern, prompt_lower, re.IGNORECASE):
                return ModerationResult(
                    allowed=False,
                    reason="This type of application cannot be built",
                    flags=["dangerous"]
                )
        
        # Check for warning patterns (allowed but flagged)
        for pattern in self.WARNING_PATTERNS:
            if re.search(pattern, prompt_lower, re.IGNORECASE):
                flags.append("suspicious_keywords")
        
        return ModerationResult(allowed=True, flags=flags)
    
    def check_code(self, files: dict) -> ModerationResult:
        """
        Check generated code for malicious patterns.
        
        Args:
            files: Dict of filename -> content
            
        Returns:
            ModerationResult with allowed=True if safe
        """
        flags = []
        
        for filename, content in files.items():
            if not isinstance(content, str):
                continue
            
            # Check for malicious patterns
            for pattern, description in self.CODE_PATTERNS:
                if re.search(pattern, content, re.IGNORECASE):
                    return ModerationResult(
                        allowed=False,
                        reason=f"Generated code contains unsafe pattern: {description}",
                        flags=["malicious_code", filename]
                    )
            
            # Check for excessive external requests (data exfil risk)
            fetch_count = len(re.findall(r"fetch\s*\(", content, re.IGNORECASE))
            xhr_count = len(re.findall(r"XMLHttpRequest|\.ajax\(", content, re.IGNORECASE))
            
            if fetch_count + xhr_count > 20:
                flags.append("high_network_activity")
        
        return ModerationResult(allowed=True, flags=flags)
    
    def check_all(self, prompt: str, files: dict) -> ModerationResult:
        """
        Run all moderation checks.
        
        Args:
            prompt: The original prompt
            files: Generated files to check
            
        Returns:
            Combined ModerationResult
        """
        # Check prompt first
        prompt_result = self.check_prompt(prompt)
        if not prompt_result.allowed:
            return prompt_result
        
        # Then check generated code
        code_result = self.check_code(files)
        if not code_result.allowed:
            return code_result
        
        # Combine flags
        all_flags = prompt_result.flags + code_result.flags
        return ModerationResult(allowed=True, flags=all_flags)


# Singleton instance
moderator = ContentModerator()


