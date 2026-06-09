from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..serializers import ImageSerializer, ImageUploadSerializer


class ImageUploadView(generics.CreateAPIView):
    serializer_class = ImageUploadSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        image = serializer.save()
        return Response(
            ImageSerializer(image).data,
            status=status.HTTP_201_CREATED,
        )
