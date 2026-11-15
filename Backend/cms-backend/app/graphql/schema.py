"""Esquema GraphQL y router ASGI montado en /graphql."""

from __future__ import annotations

import strawberry
from strawberry.fastapi import GraphQLRouter

from ..config import settings
from .context import get_context
from .mutation import Mutation
from .query import Query

schema = strawberry.Schema(query=Query, mutation=Mutation)

graphql_router = GraphQLRouter(
    schema,
    context_getter=get_context,
    # GraphiQL solo fuera de producción; en producción queda el endpoint puro.
    graphql_ide="graphiql" if settings.environment != "production" else None,
    # Habilita el multipart spec de GraphQL para uploadImage(file: Upload!).
    multipart_uploads_enabled=True,
)
