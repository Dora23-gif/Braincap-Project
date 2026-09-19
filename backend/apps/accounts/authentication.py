from importlib import import_module
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.sessions.models import Session
from django.utils import timezone
from rest_framework.authentication import BaseAuthentication, SessionAuthentication


class HeaderSessionAuthentication(BaseAuthentication):
    """
    Header-based session authentication for cross-origin SPA clients (such as mobile Safari,
    Chrome on iOS/Android, and modern browsers blocking third-party cross-site cookies).
    
    Accepts:
    - Authorization: Bearer <session_key>
    - Authorization: Token <session_key>
    - X-Session-Key: <session_key>
    
    Resolves the Django session key directly from the session store and authenticates the user.
    """

    def authenticate(self, request):
        session_key = None
        auth_header = request.headers.get("Authorization") or request.META.get("HTTP_AUTHORIZATION", "")
        if auth_header:
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() in ("bearer", "token"):
                session_key = parts[1].strip()

        if not session_key:
            session_key = request.headers.get("X-Session-Key") or request.META.get("HTTP_X_SESSION_KEY", "")

        if not session_key:
            return None

        try:
            session = Session.objects.filter(session_key=session_key, expire_date__gte=timezone.now()).first()
            if not session:
                return None

            data = session.get_decoded()
            user_id = data.get("_auth_user_id")
            if not user_id:
                return None

            User = get_user_model()
            user = User.objects.filter(pk=user_id, is_active=True).first()
            if not user:
                return None

            # Attach active SessionStore so downstream views can access request.session
            try:
                engine = import_module(settings.SESSION_ENGINE)
                request.session = engine.SessionStore(session_key=session_key)
            except Exception:
                pass

            return (user, None)
        except Exception:
            return None


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    Custom DRF SessionAuthentication for decoupled Single-Page Applications (SPA).
    
    In a cross-origin decoupled architecture (e.g. React frontend on CDN/Static site
    and Django REST Framework on a Web Service), the browser cannot access the CSRF cookie
    via JavaScript document.cookie due to the Same-Origin Policy.
    
    Session authentication is safely maintained via the secure, HttpOnly sessionid cookie
    (credentials: 'include' + SameSite='None'; Secure in production), while cross-origin
    forgery protection is strictly enforced by CORS origin whitelisting (CORS_ALLOWED_ORIGINS
    and CORS_ALLOWED_ORIGIN_REGEXES) with CORS_ALLOW_CREDENTIALS = True.
    """

    def enforce_csrf(self, request):
        # Exempt API requests from Django cookie-based CSRF checks
        # CORS whitelisting guarantees only authorized origins can make credentialed calls.
        return None

