import hashlib
import time

import cloudinary
import cloudinary.uploader
from django.conf import settings


def get_cloudinary_settings() -> dict[str, str]:
    cloud_name = settings.CLOUDINARY_CLOUD_NAME
    api_key = settings.CLOUDINARY_API_KEY
    api_secret = settings.CLOUDINARY_API_SECRET

    if not all([cloud_name, api_key, api_secret]):
        raise ValueError("Cloudinary is not configured.")

    return {
        "cloud_name": cloud_name,
        "api_key": api_key,
        "api_secret": api_secret,
    }


def configure_cloudinary() -> None:
    config = get_cloudinary_settings()
    cloudinary.config(
        cloud_name=config["cloud_name"],
        api_key=config["api_key"],
        api_secret=config["api_secret"],
        secure=True,
    )


def build_upload_folder(content_type_model: str, object_id: int) -> str:
    return f"court-booking/{content_type_model}/{object_id}"


def build_pending_upload_folder(user_id: int) -> str:
    return f"court-booking/pending/{user_id}"


def upload_image_file(file, *, folder: str) -> dict:
    configure_cloudinary()
    return cloudinary.uploader.upload(
        file,
        folder=folder,
        resource_type="image",
    )


def generate_upload_signature(*, folder: str, timestamp: int | None = None) -> dict:
    config = get_cloudinary_settings()
    upload_timestamp = timestamp or int(time.time())
    params = {
        "folder": folder,
        "timestamp": upload_timestamp,
    }
    params_string = "&".join(
        f"{key}={params[key]}" for key in sorted(params.keys())
    )
    signature = hashlib.sha1(
        f"{params_string}{config['api_secret']}".encode("utf-8")
    ).hexdigest()

    cloud_name = config["cloud_name"]
    return {
        "cloud_name": cloud_name,
        "api_key": config["api_key"],
        "timestamp": upload_timestamp,
        "signature": signature,
        "folder": folder,
        "upload_url": f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload",
    }
