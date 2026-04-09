from django.urls import path
from .views import EvaluateAnswerView

urlpatterns = [
    path('evaluate/', EvaluateAnswerView.as_view(), name='evaluate'),
]
