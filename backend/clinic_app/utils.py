from __future__ import annotations


def get_token_scopes(request) -> set:
    """Trả về set scopes từ OAuth2 token của request."""
    token = getattr(request, "auth", None)
    if token is None:
        return set()
    return set(token.scope.split())
