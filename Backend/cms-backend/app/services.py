import smtplib
import time
from email.message import EmailMessage

from .config import settings

# ---- Límite simple en memoria: 3 envíos por hora por IP ----
_hits: dict[str, list[float]] = {}
LIMIT, WINDOW = 3, 3600


def rate_limited(ip: str) -> bool:
    now = time.time()
    recent = [t for t in _hits.get(ip, []) if now - t < WINDOW]
    if len(recent) >= LIMIT:
        _hits[ip] = recent
        return True
    recent.append(now)
    _hits[ip] = recent
    return False


def send_contact_email(name: str, email: str, message: str) -> None:
    """Si SMTP no está configurado, no hace nada (el mensaje igual queda en la base)."""
    if not (settings.smtp_host and settings.mail_to):
        return
    msg = EmailMessage()
    msg["Subject"] = f"Nuevo mensaje de {name}"
    msg["From"] = settings.smtp_user or settings.mail_to
    msg["To"] = settings.mail_to
    msg["Reply-To"] = email
    msg.set_content(f"De: {name} <{email}>\n\n{message}")
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as s:
            s.starttls()
            if settings.smtp_user:
                s.login(settings.smtp_user, settings.smtp_password)
            s.send_message(msg)
    except Exception as exc:  # no romper la app por un fallo de correo
        print(f"[mail] error: {exc}")
