from django.urls import path, include
from .views import (
    CreateUserView,
    CurrentUserView,
    NoteAPIView,
    LogoutView,
    EmailTokenObtainPairView,
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('register', CreateUserView.as_view(), name='register'),
    path('me', CurrentUserView.as_view(), name='current_user'),
    path('token', EmailTokenObtainPairView.as_view(), name='get_token'),
    path('token/refresh', TokenRefreshView.as_view(), name='refresh_token'),
    path('logout', LogoutView.as_view(), name='logout'),
    path('api-auth', include('rest_framework.urls')),
    path('notes', NoteAPIView.as_view(), name='note_api'),
]