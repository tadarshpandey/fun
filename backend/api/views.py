import os
import json
import PyPDF2
from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from dotenv import load_dotenv

# Use the new required SDK
from google import genai
from google.genai import errors

# Load environment variables from .env file
load_dotenv()

# Configure Gemini Client
API_KEY = os.environ.get("GEMINI_API_KEY", "")

# Global dict to temporarily store the generated questions
CURRENT_QUESTIONS = {}

def generate_with_fallback(client, prompt):
    """
    Robust API Fallback Engine:
    During a hackathon, free-tier APIs often experience high traffic (Error 503) 
    or hit strict quota limits (Error 429). 
    Instead of failing the demo, this function catches those specific errors
    and instantly cascades to a slightly older or lighter model as a backup.
    """
    models_to_try = [
        'gemini-2.5-flash',       # Primary model (Smartest/Fastest)
        'gemini-2.5-flash-lite',  # Lighter backup variant
        'gemini-flash-latest'     # General backup pool
    ]
    
    last_error = None
    for model_name in models_to_try:
        try:
            return client.models.generate_content(
                model=model_name,
                contents=prompt
            )
        except errors.APIError as e:
            # 503 = Server Overloaded, 429 = Quota Exceeded, 404 = Model Not Found
            if e.code in [503, 429, 404]:
                last_error = e
                continue # Gracefully swallow error and try the next model
            raise e # Reraise immediately if it's a code flaw (like a Bad Request)
            
    raise Exception(f"All fallback models failed. Last error: {str(last_error)}")

class UploadResumeView(APIView):
    def post(self, request):
        if not API_KEY or API_KEY == "your_api_key_goes_here":
            return Response({
                "persona_analysis": "Error: Valid GEMINI_API_KEY environment variable is missing. Set it in backend/.env.",
                "questions": [
                    {"id": "1", "text": "Set your API key before continuing.", "keywords": [], "correct_answer": ""}
                ]
            }, status=200)
            
        resume_file = request.FILES.get("resume")
        if not resume_file:
            return Response({"error": "No resume file uploaded. Please select a PDF."}, status=400)
            
        try:
            pdf_reader = PyPDF2.PdfReader(resume_file)
            resume_text = ""
            for page in list(pdf_reader.pages)[:2]:
                resume_text += page.extract_text() + "\n"
        except Exception as e:
            return Response({"error": f"Failed to parse PDF: {str(e)}"}, status=400)

        prompt = f"""
        You are 'The Brutal Tech Lead', an extremely sarcastic, critical, but highly experienced senior developer interviewing a candidate.
        Read this candidate's resume text below.
        
        1. Give a brutal 1-sentence analysis/greeting based on their specific skills or experience.
        2. Generate exactly 3 highly difficult technical interview questions tailored EXACTLY to the skills listed on their resume. Make sure these questions are concise, specific, and answerable in 3-4 short sentences max (e.g., "What is the exact difference between X and Y?" instead of broad architectural questions).
        
        Resume text:
        {resume_text[:3000]}
        
        Return ONLY valid JSON in this exact structure:
        {{
            "persona_analysis": "your brutal 1 sentence roast",
            "questions": [
                {{"id": "1", "text": "Question 1 text"}},
                {{"id": "2", "text": "Question 2 text"}},
                {{"id": "3", "text": "Question 3 text"}}
            ]
        }}
        """
        
        try:
            client = genai.Client(api_key=API_KEY)
            response = generate_with_fallback(client, prompt)
            
            # --- JSON Extraction Logic ---
            # LLMs often confidently wrap their JSON responses in markdown code blocks 
            # (e.g. ```json ... ```) even when we tell them not to.
            # This logic strips those markdown wrappers out so json.loads() doesn't crash.
            response_text = response.text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:-3]
            elif response_text.startswith("```"):
                response_text = response_text[3:-3]
                
            data = json.loads(response_text)
            
            global CURRENT_QUESTIONS
            CURRENT_QUESTIONS = {q["id"]: q["text"] for q in data.get("questions", [])}
            
            return Response(data, status=status.HTTP_200_OK)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": f"Gemini API Error: {str(e)}"}, status=500)


class EvaluateAnswerView(APIView):
    def post(self, request):
        if not API_KEY or API_KEY == "your_api_key_goes_here":
            return Response({
                "roast": "Valid GEMINI_API_KEY is not set. I can't even roast you properly.",
                "score": 0,
                "correct_answer": "Go set your API key.",
                "transcript": request.data.get("text", "")
            }, status=200)
            
        question_id = request.data.get("question_id")
        text_input = request.data.get("text", "").strip()

        if not question_id:
            return Response({"error": "question_id required"}, status=400)
            
        question_text = CURRENT_QUESTIONS.get(question_id, "Unknown Question")

        prompt = f"""
        You are 'The Brutal Tech Lead'.
        You asked the candidate this question: "{question_text}"
        
        The candidate answered with: "{text_input}"
        
        Evaluate their technical accuracy. 
        If they said "um", waffled, dodged the question, or were technically wrong, roast them brutally and specifically.
        Assign a score out of 10.
        Give the actual correct, concise technical answer.
        
        Return ONLY valid JSON in this exact structure:
        {{
            "roast": "your brutal, specific feedback",
            "score": 5,
            "correct_answer": "the actual correct answer"
        }}
        """
        
        try:
            client = genai.Client(api_key=API_KEY)
            response = generate_with_fallback(client, prompt)
            
            response_text = response.text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:-3]
            elif response_text.startswith("```"):
                response_text = response_text[3:-3]
                
            result = json.loads(response_text)
            result["transcript"] = text_input
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({
                "roast": "Your answer was so bad it broke my language model. Or maybe there's a JSON parse error.",
                "score": 1,
                "correct_answer": "Try again when you actually know the material.",
                "transcript": text_input
            }, status=200)
