import httpx
import json
import re
from api.config.settings import settings

def _extract_json(text: str):
    """Grok sometimes wraps JSON in ```json fences or adds prose — pull the JSON out."""
    if not text:
        return None
    fence = re.search(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", text, re.DOTALL)
    candidate = fence.group(1) if fence else text.strip()
    try:
        return json.loads(candidate)
    except Exception:
        brace = re.search(r"(\{.*\})", text, re.DOTALL)
        if brace:
            try:
                return json.loads(brace.group(1))
            except Exception:
                return None
    return None


class GrokService:
    def __init__(self):
        self.api_key = settings.GROK_API_KEY
        self.base_url = "https://api.x.ai/v1"
        self.model = "grok-2"

    async def _complete(self, messages, max_tokens=2000, temperature=0.7):
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
                timeout=45.0,
            )
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
            raise RuntimeError(f"Grok API error: {response.status_code} {response.text[:200]}")

    async def generate_learning_path(self, topic: str, difficulty: str, goals: str = None, skill_level: str = None) -> dict:
        """Generate a structured, modular learning path. Returns dict: {overview, modules: [...]}."""
        effective_level = skill_level or difficulty
        prompt = f"""Create a detailed, modular learning path for the topic: {topic}

Difficulty/skill level: {effective_level}
{f'User goals: {goals}' if goals else ''}

Respond with ONLY valid JSON (no markdown fences, no prose) matching exactly this shape:
{{
  "overview": "2-4 sentence overview of the path",
  "modules": [
    {{
      "title": "Module 1: <short name>",
      "content": "A few paragraphs of teaching content for this module, written directly to the learner.",
      "resources": ["short resource suggestion 1", "short resource suggestion 2"],
      "exercises": ["practice exercise 1", "practice exercise 2"]
    }}
  ]
}}

Produce between 4 and 6 modules, ordered from foundational to advanced, ending with a capstone/project module. Keep valid JSON — escape any quotes inside strings."""

        try:
            raw = await self._complete([{"role": "user", "content": prompt}], max_tokens=3000)
            parsed = _extract_json(raw)
            if parsed and isinstance(parsed, dict) and parsed.get("modules"):
                return parsed
            return {
                "overview": raw[:400] if raw else f"A {effective_level} path for {topic}.",
                "modules": [{"title": "Learning Path", "content": raw or "", "resources": [], "exercises": []}],
            }
        except Exception as e:
            return {
                "overview": f"Couldn't reach the AI service ({e}). Here's a starting outline for {topic}.",
                "modules": [
                    {"title": "Module 1: Foundations", "content": f"Start with the core concepts of {topic}.", "resources": [], "exercises": []},
                    {"title": "Module 2: Practice", "content": f"Apply {topic} with hands-on exercises.", "resources": [], "exercises": []},
                ],
            }

    async def generate_skill_quiz(self, topic: str, num_questions: int = 5) -> dict:
        """Generate a multiple-choice skill-assessment quiz for a topic."""
        prompt = f"""Create a {num_questions}-question multiple-choice skill-assessment quiz about: {topic}

Mix difficulty — roughly a third beginner, a third intermediate, a third advanced — so the results can estimate the learner's overall skill level.

Respond with ONLY valid JSON (no markdown fences, no prose) matching exactly this shape:
{{
  "questions": [
    {{
      "question": "question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correct_index": 0,
      "level": "beginner"
    }}
  ]
}}

"level" must be one of: beginner, intermediate, advanced. "correct_index" is 0-based into "options"."""

        try:
            raw = await self._complete([{"role": "user", "content": prompt}], max_tokens=2000)
            parsed = _extract_json(raw)
            if parsed and isinstance(parsed, dict) and parsed.get("questions"):
                return parsed
        except Exception:
            pass
        # Fallback quiz so the flow never breaks even if the AI call fails
        return {
            "questions": [
                {
                    "question": f"How would you describe your current experience with {topic}?",
                    "options": ["Never worked with it", "Used it a little", "Comfortable with it", "Very experienced"],
                    "correct_index": 3,
                    "level": "beginner",
                },
                {
                    "question": f"Have you completed a real project involving {topic}?",
                    "options": ["No", "A tutorial only", "One small project", "Several projects"],
                    "correct_index": 3,
                    "level": "intermediate",
                },
                {
                    "question": f"Could you explain an advanced concept in {topic} to someone else?",
                    "options": ["Not at all", "Maybe the basics", "Yes, mostly", "Yes, confidently"],
                    "correct_index": 3,
                    "level": "advanced",
                },
            ]
        }

    async def chat(self, message: str, history: list = None) -> str:
        """General-purpose tutoring chatbot, using conversation history for context."""
        system = {
            "role": "system",
            "content": "You are the NeuroPath AI tutor — a friendly, encouraging assistant that helps learners understand topics from their learning paths. Keep answers focused and practical.",
        }
        messages = [system]
        for m in (history or [])[-20:]:
            role = m.get("role") if isinstance(m, dict) else getattr(m, "role", "user")
            content = m.get("content") if isinstance(m, dict) else getattr(m, "content", "")
            if role not in ("user", "assistant"):
                role = "user"
            messages.append({"role": role, "content": content})
        messages.append({"role": "user", "content": message})

        try:
            return await self._complete(messages, max_tokens=800, temperature=0.8)
        except Exception as e:
            return f"Sorry, I couldn't reach the AI service right now ({e}). Try again in a moment."

    async def provide_feedback(self, topic: str, user_response: str) -> str:
        """Provide AI feedback on user learning"""
        prompt = f"""Topic: {topic}
User Response: {user_response}

Provide constructive feedback and suggestions for improvement. Be encouraging and specific."""
        try:
            return await self._complete([{"role": "user", "content": prompt}], max_tokens=1000)
        except Exception as e:
            return json.dumps({"error": str(e)})
