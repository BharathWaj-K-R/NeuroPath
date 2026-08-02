import httpx
import json
from api.config.settings import settings

class GrokService:
    def __init__(self):
        self.api_key = settings.GROK_API_KEY
        self.base_url = "https://api.x.ai/v1"
        self.model = "grok-2"
    
    async def generate_learning_path(self, topic: str, difficulty: str, goals: str = None) -> str:
        """Generate personalized learning path using Grok API"""
        
        prompt = f"""
        Create a detailed learning path for the topic: {topic}
        
        Difficulty Level: {difficulty}
        {f'User Goals: {goals}' if goals else ''}
        
        Provide a structured learning plan with:
        1. Learning Objectives
        2. Key Concepts to Master
        3. Recommended Resources (books, videos, articles)
        4. Practice Exercises
        5. Milestones and Checkpoints
        6. Estimated Time Required
        
        Format as clear, organized sections.
        """
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.7,
                        "max_tokens": 2000
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    return json.dumps({
                        "error": f"Grok API error: {response.status_code}",
                        "fallback": True,
                        "topic": topic,
                        "difficulty": difficulty
                    })
        except Exception as e:
            return json.dumps({
                "error": str(e),
                "fallback": True,
                "topic": topic,
                "difficulty": difficulty
            })
    
    async def generate_quiz(self, topic: str, num_questions: int = 5) -> str:
        """Generate quiz questions"""
        
        prompt = f"""
        Generate {num_questions} quiz questions about {topic}.
        Include multiple choice options and correct answers.
        Format as a clear list.
        """
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.7,
                        "max_tokens": 1500
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    return json.dumps({"error": f"Grok API error: {response.status_code}"})
        except Exception as e:
            return json.dumps({"error": str(e)})
    
    async def provide_feedback(self, topic: str, user_response: str) -> str:
        """Provide AI feedback on user learning"""
        
        prompt = f"""
        Topic: {topic}
        User Response: {user_response}
        
        Provide constructive feedback and suggestions for improvement.
        Be encouraging and specific.
        """
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.7,
                        "max_tokens": 1000
                    },
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    return json.dumps({"error": f"Grok API error: {response.status_code}"})
        except Exception as e:
            return json.dumps({"error": str(e)})
