from apps.api.app.storage.s3 import S3Storage


def get_storage() -> S3Storage:
    return S3Storage()
