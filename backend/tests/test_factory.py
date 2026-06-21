from app.llm.factory import get_analyzer
from app.llm.openai_analyzer import OpenAIAnalyzer
from app.llm.anthropic_analyzer import AnthropicAnalyzer


def test_factory_openai(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    assert isinstance(get_analyzer(), OpenAIAnalyzer)


def test_factory_anthropic(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "anthropic")
    assert isinstance(get_analyzer(), AnthropicAnalyzer)
