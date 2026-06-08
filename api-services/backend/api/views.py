from django.contrib.auth.models import User
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from .serializers import UserSerializer, NoteSerializer
from .models import Note
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


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
        return Response(status=status.HTTP_204_NO_CONTENT)  