from rest_framework.authentication import SessionAuthentication

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
