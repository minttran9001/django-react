from django.urls import path, include
from .views import (
    CreateUserView,
    CurrentUserView,
    CookieTokenRefreshView,
    NoteAPIView,
    LogoutView,
    EmailTokenObtainPairView,
)

urlpatterns = [
    path('register', CreateUserView.as_view(), name='register'),
    path('me', CurrentUserView.as_view(), name='current_user'),
    path('token', EmailTokenObtainPairView.as_view(), name='get_token'),
    path('token/refresh', CookieTokenRefreshView.as_view(), name='refresh_token'),
    path('logout', LogoutView.as_view(), name='logout'),
    path('api-auth', include('rest_framework.urls')),
    path('notes', NoteAPIView.as_view(), name='note_api'),
]