from app.sanitize import sanitize_rich_html


def test_rich_text_keeps_formatting_and_removes_scripts():
    raw = (
        '<p style="text-align:justify;position:fixed" onclick="alert(1)">'
        'Hola <strong>mundo</strong></p><script>alert(1)</script>'
    )
    clean = sanitize_rich_html(raw)
    assert "text-align:justify" in clean
    assert "position" not in clean
    assert "onclick" not in clean
    assert "<script" not in clean
    assert "<strong>mundo</strong>" in clean


def test_rich_text_rejects_javascript_links_and_data_attributes():
    clean = sanitize_rich_html(
        '<a href="javascript:alert(1)">mal</a>'
        '<a href="https://example.com">bien</a>'
        '<ul><li data-list-item-id="abc">Uno</li></ul>'
    )
    assert "javascript:" not in clean
    assert "data-list-item-id" not in clean
    assert 'href="https://example.com"' in clean
    assert 'rel="noopener noreferrer"' in clean
