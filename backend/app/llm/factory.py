from ..config import load_llm_config
from .openai_analyzer import OpenAIAnalyzer
from .anthropic_analyzer import AnthropicAnalyzer


def get_analyzer():
    c = load_llm_config()
    return AnthropicAnalyzer(c) if c.provider == "anthropic" else OpenAIAnalyzer(c)
