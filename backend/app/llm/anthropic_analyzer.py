import httpx

from .base import BaseAnalyzer, ANALYZE_PROMPT, parse_json_loose


class AnthropicAnalyzer(BaseAnalyzer):
    async def analyze(self, text: str) -> dict:
        async with httpx.AsyncClient(timeout=40) as c:
            r = await c.post(
                f"{self.config.base_url}/v1/messages",
                headers={
                    "x-api-key": self.config.api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": self.config.model,
                    "max_tokens": 1024,
                    "system": ANALYZE_PROMPT,
                    "messages": [{"role": "user", "content": text}],
                },
            )
            r.raise_for_status()
            content = r.json()["content"][0]["text"]
            return parse_json_loose(content)
