"""Password hashing, opaque session tokens, OTP hashing and signatures.

Only a SHA-256 digest of each session token is stored, so a database leak does
not hand over live admin sessions. OTP codes are HMACed with the backend
secret, so a database dump alone cannot recover a live code.
"""

import base64
import hashlib
import hmac
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

_hasher = PasswordHasher()

MIN_PASSWORD_LENGTH = 12
MAX_PASSWORD_LENGTH = 200

ENCRYPTION_PREFIX = "v1"


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def needs_rehash(password_hash: str) -> bool:
    try:
        return _hasher.check_needs_rehash(password_hash)
    except InvalidHashError:
        return True


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_otp(length: int = 6) -> str:
    """Cryptographically secure numeric code with leading zeros preserved."""

    return "".join(str(secrets.randbelow(10)) for _ in range(length))


def hash_otp(code: str, purpose: str) -> str:
    message = f"{purpose}:{code}".encode("utf-8")
    return hmac.new(settings.secret_key.encode("utf-8"), message, hashlib.sha256).hexdigest()


def verify_otp_hash(code: str, purpose: str, expected_hash: str) -> bool:
    return hmac.compare_digest(hash_otp(code, purpose), expected_hash)


def password_problem(password: str) -> str | None:
    """Return a safe, human-readable policy problem, or None when acceptable."""

    if len(password) < MIN_PASSWORD_LENGTH:
        return f"Use at least {MIN_PASSWORD_LENGTH} characters."
    if len(password) > MAX_PASSWORD_LENGTH:
        return "That password is too long."
    if password.lower() in {
        "password",
        "password123",
        "123456789012",
        "qwertyuiop12",
    }:
        return "Choose a less predictable password."
    return None


def sign_webhook(timestamp: str, body: bytes, secret: str) -> str:
    message = timestamp.encode("utf-8") + b"." + body
    return hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()


def verify_webhook_signature(
    timestamp: str, body: bytes, signature: str, secret: str
) -> bool:
    expected = sign_webhook(timestamp, body, secret)
    provided = signature.strip()
    if provided.startswith("sha256="):
        provided = provided[len("sha256=") :]
    return hmac.compare_digest(expected, provided)


def _provider_key() -> bytes:
    """Derive an AES-256 key from the configured provider-token secret."""

    return hashlib.sha256(settings.github_token_key.encode("utf-8")).digest()


def encrypt_secret(value: str, purpose: str = "github") -> str:
    """Encrypt a provider credential with AES-256-GCM.

    The purpose string is authenticated but not stored separately; it is part
    of the envelope so a token cannot be silently reused in another context.
    """

    nonce = secrets.token_bytes(12)
    sealed = AESGCM(_provider_key()).encrypt(
        nonce, value.encode("utf-8"), purpose.encode("utf-8")
    )
    payload = base64.urlsafe_b64encode(nonce + sealed).decode("ascii")
    return f"{ENCRYPTION_PREFIX}.{purpose}.{payload}"


def decrypt_secret(envelope: str, purpose: str = "github") -> str:
    """Return the plaintext credential or raise ValueError if it is invalid."""

    try:
        version, stored_purpose, payload = envelope.split(".", 2)
    except ValueError as exc:
        raise ValueError("Malformed credential envelope.") from exc
    if version != ENCRYPTION_PREFIX or stored_purpose != purpose:
        raise ValueError("Unsupported credential envelope.")
    try:
        raw = base64.urlsafe_b64decode(payload.encode("ascii"))
        nonce, sealed = raw[:12], raw[12:]
        plaintext = AESGCM(_provider_key()).decrypt(
            nonce, sealed, purpose.encode("utf-8")
        )
    except (ValueError, InvalidTag, KeyError) as exc:
        raise ValueError("The stored credential could not be decrypted.") from exc
    return plaintext.decode("utf-8")
