import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError

from apps.api.app.core.config import settings

PRESIGN_TTL = 60 * 60 * 24  # 1 day


class S3Storage:
    def __init__(self) -> None:
        self._client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            **({"region_name": settings.s3_region} if settings.s3_region else {}),
            # Path-style always — the public endpoint is a plain domain and
            # virtual-host addressing (bucket.riocut.com) has no DNS.
            config=BotoConfig(s3={"addressing_style": "path"}),
        )
        self._bucket = settings.s3_bucket
        self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        try:
            self._client.head_bucket(Bucket=self._bucket)
        except ClientError:
            self._client.create_bucket(Bucket=self._bucket)

    def put(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        self._client.put_object(Bucket=self._bucket, Key=key, Body=data, ContentType=content_type)
        return key

    def put_stream(self, key: str, fileobj, content_type: str = "application/octet-stream") -> str:
        # Chunked multipart upload — large files never fully enter memory.
        self._client.upload_fileobj(
            fileobj, self._bucket, key, ExtraArgs={"ContentType": content_type}
        )
        return key

    def get(self, key: str) -> bytes:
        return self._client.get_object(Bucket=self._bucket, Key=key)["Body"].read()

    def url(self, key: str) -> str:
        # Presigned GET so the browser can load the asset without a public bucket.
        return self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._bucket, "Key": key},
            ExpiresIn=PRESIGN_TTL,
        )

    def delete(self, key: str) -> None:
        self._client.delete_object(Bucket=self._bucket, Key=key)
