from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import Image
from api.utils.exceptions import error_response, validation_error_response

from ..serializers import ImageResourceSerializer


class ImageUploadView(APIView):
    permission_classes = [IsAuthenticated]
    ## Add a parser for the image file
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        files = request.FILES.getlist("images")
        if not files:
            file = request.FILES.get("image")
            if file:
                files = [file]

        if not files:
            return validation_error_response(
                {"images": ["Upload at least one image file."]},
            )

        folder = build_pending_upload_folder(request.user.id)
        created_images = []

        try:
            for uploaded_file in files:
                result = upload_image_file(uploaded_file, folder=folder)
                created_images.append(
                    Image.objects.create(
                        owner=request.user,
                        url=result["secure_url"],
                        public_id=result["public_id"],
                    )
                )
        except ValueError as exc:
            return error_response(
                str(exc),
                code="service_unavailable",
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception:
            return validation_error_response(
                {"images": ["Failed to upload one or more images."]},
            )

        return Response(
            {"images": ImageResourceSerializer(created_images, many=True).data},
            status=status.HTTP_201_CREATED,
        )
