import httpx

from .base import BaseAnalyzer, ANALYZE_PROMPT, parse_json_loose


class OpenAIAnalyzer(BaseAnalyzer):
    async def analyze(self, text: str) -> dict:
        async with httpx.AsyncClient(timeout=40) as c:
            r = await c.post(
                f"{self.config.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.config.api_key}"},
                json={
                    "model": self.config.model,
                    "messages": [
                        {"role": "system", "content": ANALYZE_PROMPT},
                        {"role": "user", "content": text},
                    ],
                    "temperature": 0.7,
                },
            )
            r.raise_for_status()
            content = r.json()["choices"][0]["message"]["content"]
            return parse_json_loose(content)
