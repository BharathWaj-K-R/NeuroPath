import google.generativeai as genai
from api.config.settings import settings
import json

class GeminiService:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
    
    async def generate_learning_path(self, topic: str, difficulty: str, goals: str = None) -> str:
        """Generate personalized learning path using Gemini"""
        
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
        
        Format as JSON with clear structure.
        """
        
        try:
            response = self.model.generate_content(prompt)
            return response.text
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
        Format as JSON.
        """
        
        try:
            response = self.model.generate_content(prompt)
            return response.text
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
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return json.dumps({"error": str(e)})
