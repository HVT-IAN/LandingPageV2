"""Errores GraphQL: mismos códigos que la API REST.

REST responde códigos HTTP; GraphQL los expone en ``extensions.code`` con el
mismo significado (sección 5.4 del contexto de equipo).
"""

from __future__ import annotations

from graphql import GraphQLError
from pydantic import ValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

BAD_USER_INPUT = "BAD_USER_INPUT"
UNAUTHENTICATED = "UNAUTHENTICATED"
NOT_FOUND = "NOT_FOUND"
CONFLICT = "CONFLICT"
PAYLOAD_TOO_LARGE = "PAYLOAD_TOO_LARGE"
TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS"
INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"

_CODE_BY_STATUS = {
    400: BAD_USER_INPUT,
    401: UNAUTHENTICATED,
    404: NOT_FOUND,
    409: CONFLICT,
    413: PAYLOAD_TOO_LARGE,
    429: TOO_MANY_REQUESTS,
}

# Mensajes en español para los errores de validación de Pydantic.
_VALIDATION_MESSAGES = {
    "missing": "es obligatorio",
    "string_too_short": "es demasiado corto",
    "string_too_long": "es demasiado largo",
    "string_pattern_mismatch": "tiene un formato inválido",
    "string_type": "debe ser texto",
    "string_unicode": "contiene caracteres inválidos",
    "int_parsing": "debe ser un número entero",
    "int_type": "debe ser un número entero",
    "bool_parsing": "debe ser verdadero o falso",
    "bool_type": "debe ser verdadero o falso",
    "list_type": "debe ser una lista",
    "value_error": "valor inválido",
    "greater_than_equal": "es menor que el mínimo permitido",
    "less_than_equal": "es mayor que el máximo permitido",
}


def graphql_error(message: str, code: str = BAD_USER_INPUT, **extensions) -> GraphQLError:
    return GraphQLError(message, extensions={"code": code, **extensions})


def error_from_http(exc: StarletteHTTPException) -> GraphQLError:
    code = _CODE_BY_STATUS.get(exc.status_code, INTERNAL_SERVER_ERROR)
    return graphql_error(str(exc.detail), code)


def error_from_validation(exc: ValidationError) -> GraphQLError:
    detalles = []
    partes = []
    for error in exc.errors():
        campo = ".".join(str(parte) for parte in error["loc"]) or "input"
        mensaje = _VALIDATION_MESSAGES.get(error["type"], "valor inválido")
        detalles.append({"field": campo, "message": mensaje})
        partes.append(f"{campo} {mensaje}")
    return graphql_error("Datos inválidos: " + "; ".join(partes), BAD_USER_INPUT, details=detalles)


def run(action, *args, **kwargs):
    """Ejecuta lógica REST y traduce sus excepciones al contrato GraphQL."""

    try:
        return action(*args, **kwargs)
    except StarletteHTTPException as exc:
        raise error_from_http(exc) from exc
    except ValidationError as exc:
        raise error_from_validation(exc) from exc
