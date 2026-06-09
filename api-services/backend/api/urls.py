from django.urls import path, include
from .views import (
    CreateUserView,
    CurrentUserView,
    CookieTokenRefreshView,
    LogoutView,
    EmailTokenObtainPairView,
    VerifyEmailView,
    ResendVerificationEmailView,
    SportListView,
    CourtCenterCreateView,
)

urlpatterns = [
    path('register', CreateUserView.as_view(), name='register'),
    path('me', CurrentUserView.as_view(), name='current_user'),
    path('token', EmailTokenObtainPairView.as_view(), name='get_token'),
    path('token/refresh', CookieTokenRefreshView.as_view(), name='refresh_token'),
    path('logout', LogoutView.as_view(), name='logout'),
    path('verify-email', VerifyEmailView.as_view(), name='verify_email'),
    path('api-auth', include('rest_framework.urls')),
    path('resend-verification-email', ResendVerificationEmailView.as_view(), name='resend_verification_email'),
    path('sports', SportListView.as_view(), name='sport_list'),
    path('court-centers', CourtCenterCreateView.as_view(), name='court_center_create'),
]