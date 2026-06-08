from django.urls import path, include
from .views import CreateUserView, NoteAPIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('register/', CreateUserView.as_view(), name='register'),
    path('token/', TokenObtainPairView.as_view(), name='get_token'),
    path('token/refresh/', TokenRefreshView.as_view(), name='refresh_token'),
    path('api-auth/', include('rest_framework.urls')),
    path('notes/', NoteAPIView.as_view(), name='note_api'),
]