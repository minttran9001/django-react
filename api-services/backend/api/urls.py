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
    CourtCenterCustomerListView,
    MyCourtCenterListView,
    ImageUploadView,
    MyCourtCenterDetailsView,
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
    path('images/upload', ImageUploadView.as_view(), name='image_upload'),
    # court center
    path('court-centers', CourtCenterCustomerListView.as_view(), name='court_center_customer_list'), # list all court centers
    path('court-centers/mine', MyCourtCenterListView.as_view(), name='court_center_owner_list'), # list all court centers owned by the current user
    path('court-centers/create', CourtCenterCreateView.as_view(), name='court_center_create'), # create a new court center
    path('court-centers/mine/<int:pk>', MyCourtCenterDetailsView.as_view(), name='court_center_detail'), # get/patch/delete a court center by id
]