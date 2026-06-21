import os
from dataclasses import dataclass


@dataclass
class LLMConfig:
    provider: str
    api_key: str
    base_url: str
    model: str


def load_llm_config() -> LLMConfig:
    p = os.getenv("LLM_PROVIDER", "openai").lower()
    if p == "anthropic":
        return LLMConfig(
            "anthropic",
            os.getenv("ANTHROPIC_API_KEY", ""),
            os.getenv("ANTHROPIC_BASE_URL", "https://api.anthropic.com"),
            os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest"),
        )
    return LLMConfig(
        "openai",
        os.getenv("OPENAI_API_KEY", ""),
        os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
    )
