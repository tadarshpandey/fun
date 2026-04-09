from django.urls import path
from .views import EvaluateAnswerView, UploadResumeView

urlpatterns = [
    path('evaluate/', EvaluateAnswerView.as_view(), name='evaluate'),
    path('upload-resume/', UploadResumeView.as_view(), name='upload-resume'),
]
