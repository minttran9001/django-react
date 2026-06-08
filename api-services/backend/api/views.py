from django.contrib.auth.models import User
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .cookies import clear_jwt_cookies, set_jwt_cookies
from .models import Note
from .serializers import (
    CurrentUserSerializer,
    EmailTokenObtainPairSerializer,
    NoteSerializer,
    UserSerializer,
)


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        token_serializer = EmailTokenObtainPairSerializer(
            data={
                "email": request.data["email"],
                "password": request.data["password"],
            }
        )
        token_serializer.is_valid(raise_exception=True)
        tokens = token_serializer.validated_data

        response = Response(
            {"user": CurrentUserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )
        set_jwt_cookies(response, tokens["access"], tokens["refresh"])
        return response


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        if response.status_code != status.HTTP_200_OK:
            return response

        user = User.objects.get(email=request.data["email"])
        set_jwt_cookies(response, response.data["access"], response.data["refresh"])
        response.data = {"user": CurrentUserSerializer(user).data}
        return response


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = CurrentUserSerializer(request.user)
        return Response({"user": serializer.data})


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({"success": True}, status=status.HTTP_200_OK)
        clear_jwt_cookies(response)
        return response


class NoteAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notes = Note.objects.filter(author=request.user)
        serializer = NoteSerializer(notes, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = NoteSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(author=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        note = Note.objects.get(id=pk)
        serializer = NoteSerializer(note, data=request.data)
        if serializer.is_valid():
            serializer.save(author=request.user)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        note = Note.objects.get(id=pk)
        if note.author == request.user:
            note.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(status=status.HTTP_403_FORBIDDEN)
