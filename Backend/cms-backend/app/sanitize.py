"""Sanitización del HTML producido por el editor enriquecido."""

from __future__ import annotations

import nh3

# Etiquetas que puede producir TinyMCE con la barra configurada.
_ALLOWED_TAGS = {
    "a", "b", "blockquote", "br", "caption", "code", "col", "colgroup",
    "del", "div", "em", "figcaption", "figure", "h1", "h2", "h3", "h4",
    "h5", "h6", "hr", "i", "img", "li", "mark", "ol", "p", "pre", "s",
    "span", "strong", "sub", "sup", "table", "tbody", "td", "tfoot", "th",
    "thead", "tr", "u", "ul",
}

_ALLOWED_ATTRIBUTES = {
    "*": {"class", "style"},
    "a": {"href", "title", "target"},
    "img": {"src", "alt", "title", "width", "height", "loading"},
    "ol": {"start"},
    "td": {"colspan", "rowspan"},
    "th": {"colspan", "rowspan", "scope"},
}

# Solo propiedades tipográficas y de tablas; nada de position, display, etc.
_ALLOWED_STYLE_PROPERTIES = {
    "background-color",
    "border",
    "border-collapse",
    "border-color",
    "border-style",
    "border-width",
    "color",
    "font-family",
    "font-size",
    "font-style",
    "font-weight",
    "height",
    "line-height",
    "margin",
    "margin-bottom",
    "margin-left",
    "margin-right",
    "margin-top",
    "max-width",
    "padding",
    "text-align",
    "text-decoration",
    "vertical-align",
    "white-space",
    "width",
}

_CLEAN_CONTENT_TAGS = {
    "applet", "button", "embed", "form", "iframe", "input", "object", "script",
    "select", "style", "textarea",
}


def _attribute_filter(tag: str, attribute: str, value: str) -> str | None:
    """Elimina atributos internos del editor que no aportan al contenido."""

    if attribute.startswith("data-"):
        return None
    return value


def sanitize_rich_html(value: str | None) -> str:
    """Devuelve HTML seguro para guardar o enviar al frontend."""

    if not value:
        return ""
    return nh3.clean(
        str(value),
        tags=_ALLOWED_TAGS,
        clean_content_tags=_CLEAN_CONTENT_TAGS,
        attributes=_ALLOWED_ATTRIBUTES,
        attribute_filter=_attribute_filter,
        filter_style_properties=_ALLOWED_STYLE_PROPERTIES,
        url_schemes={"http", "https", "mailto"},
        link_rel="noopener noreferrer",
    )
