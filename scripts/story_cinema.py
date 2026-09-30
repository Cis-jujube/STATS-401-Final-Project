"""Decorative, accessible-hidden surfaces for the continuous visual story.

These geometric elements are not data marks. The original chart pictures and
their alternative text remain the only figure content exposed to readers.
"""
from html import escape


def title_lines(title: str) -> str:
    return '<br>'.join(
        f'<span class="title-mask"><span style="--line:{i}">{line}</span></span>'
        for i, line in enumerate(title.split('<br>'))
    )


def portal() -> str:
    rings = ''.join(
        f'<ellipse cx="400" cy="300" rx="{80 + i * 38}" ry="{65 + i * 27}"/>'
        for i in range(9)
    )
    return f'<svg class="score-portal" viewBox="0 0 800 600" aria-hidden="true">{rings}</svg>'


def figure_scenery() -> str:
    planes = ''.join(f'<i style="--plane:{i}"></i>' for i in range(1, 4))
    return f'<div class="figure-depth" aria-hidden="true">{planes}</div>'


def strips(file: str, count: int = 6) -> str:
    """Clipped copies assemble the unchanged chart; no values are interpolated."""
    return ''.join(
        f'<div class="cinema-strip" style="--strip:{i};--cut-top:{i * 100 / count:.4f}%;'
        f'--cut-bottom:{(count - i - 1) * 100 / count:.4f}%" aria-hidden="true">'
        f'<picture><source media="(max-width:700px)" srcset="assets/story/{file}-mobile.svg">'
        f'<img src="assets/story/{file}.svg" alt="" loading="lazy" decoding="async"></picture></div>'
        for i in range(count)
    )


def archive(scenes: list) -> str:
    links = ''.join(
        f'<a href="analysis.html#{section_id}"><span>{escape(topic)}</span>'
        '<span aria-hidden="true">↗</span></a>'
        for section_id, _, topic, *_ in scenes
    )
    return f'<nav class="evidence-archive" aria-label="Explore the evidence">{links}</nav>'
