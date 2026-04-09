from django.shortcuts import render

import json

# Having some import statements for the API views
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


# Mock DB of questions
QUESTIONS = {
    "1": "What is the Virtual DOM in React?",
    "2": "Explain useEffect dependencies.",
    "3": "What is prop drilling?"
}


# Create your views here.

def mock_transcribe_audio(audio_file):
    # Replace this later with Whisper API
    return "Um I think virtual dom is like faster dom and react uses it to update things quickly"


# ---- MOCK LLM CALL ----
def call_llm(question, transcript):
    # Replace this with OpenAI/Gemini later
    return {
        "roast": "Wow. That was painful. You said 'um' like it's part of the API. Also 'faster DOM'? That's not even a concept, that's a coping mechanism.",
        "score": 3,
        "correct_answer": "The Virtual DOM is a lightweight JavaScript representation of the real DOM. React uses it to efficiently update only the parts of the UI that change via a diffing algorithm.",
        "transcript": transcript
    }


class EvaluateAnswerView(APIView):

    def post(self, request):
        question_id = request.data.get("question_id")
        audio_file = request.FILES.get("audio")
        text_input = request.data.get("text")

        if not question_id:
            return Response({"error": "question_id required"}, status=400)

        question = QUESTIONS.get(question_id, "")

        # Step 1: Get transcript
        if audio_file:
            transcript = mock_transcribe_audio(audio_file)
        elif text_input:
            transcript = text_input
        else:
            return Response({"error": "No input provided"}, status=400)

        # Step 2: Send to LLM
        result = call_llm(question, transcript)

        return Response(result, status=status.HTTP_200_OK)
