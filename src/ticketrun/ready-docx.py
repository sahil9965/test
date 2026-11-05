#!/usr/bin/env python3
"""Ready-made Word raffle tickets: 8 tickets per page, numbered 1-200, each ticket and its stub numbered by a SEQ field,
so the Word file does what the "how to number raffle tickets in Word" page explains. The numbers are also stored as the
field results, so the file shows the right numbers as soon as it opens; Ctrl+A then F9 recounts them after you edit.
Writes sites/ticketrun/docx/raffle-tickets-1-200-word-letter.docx and -a4.docx.
Usage: python3 src/ticketrun/ready-docx.py   (needs python-docx; re-run after changing the layout below)
"""
import os, sys
from docx import Document
from docx.enum.table import WD_ROW_HEIGHT_RULE, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, Inches, RGBColor

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../sites/ticketrun/docx")
COUNT, PER_PAGE = 200, 8
PAPERS = {"letter": (8.5, 11.0), "a4": (8.27, 11.69)}
ACCENT = RGBColor(0x1d, 0x4e, 0xd8)


def add_field(par, instr, cached, size, bold=False, color=None):
    """A complex field { instr } whose stored result is `cached`."""
    def run():
        r = par.add_run(); r.font.size = Pt(size); r.bold = bold
        if color is not None: r.font.color.rgb = color
        return r
    for kind in ("begin", None, "separate", "text", "end"):
        r = run()
        if kind == "text": r.text = cached; continue
        if kind is None:
            it = OxmlElement("w:instrText"); it.set(qn("xml:space"), "preserve"); it.text = f" {instr} "; r._r.append(it); continue
        fc = OxmlElement("w:fldChar"); fc.set(qn("w:fldCharType"), kind); r._r.append(fc)


def text(par, s, size=10, bold=False, color=None, italic=False):
    r = par.add_run(s); r.font.size = Pt(size); r.bold = bold; r.italic = italic
    if color is not None: r.font.color.rgb = color
    return r


def para(cell, first=False, before=0, after=2, align=None):
    p = cell.paragraphs[0] if first else cell.add_paragraph()
    p.paragraph_format.space_before = Pt(before); p.paragraph_format.space_after = Pt(after)
    if align is not None: p.alignment = align
    return p


def borders(cell, **sides):
    tcPr = cell._tc.get_or_add_tcPr(); b = OxmlElement("w:tcBorders")
    for side, (val, sz) in sides.items():
        e = OxmlElement(f"w:{side}"); e.set(qn("w:val"), val); e.set(qn("w:sz"), str(sz)); e.set(qn("w:color"), "444444"); b.append(e)
    tcPr.append(b)


def margins(cell, top=60, left=120, bottom=60, right=120):
    tcPr = cell._tc.get_or_add_tcPr(); m = OxmlElement("w:tcMar")
    for k, v in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        e = OxmlElement(f"w:{k}"); e.set(qn("w:w"), str(v)); e.set(qn("w:type"), "dxa"); m.append(e)
    tcPr.append(m)


def build(paper):
    pw, ph = PAPERS[paper]
    doc = Document()
    s = doc.sections[0]
    s.page_width, s.page_height = Inches(pw), Inches(ph)
    s.left_margin = s.right_margin = Inches(0.5); s.top_margin = s.bottom_margin = Inches(0.5)
    doc.styles["Normal"].font.name = "Arial"; doc.styles["Normal"].element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
    doc.core_properties.title = "Raffle Tickets 1-200, Word Template with Numbered Stubs"
    doc.core_properties.author = "TicketRun (raffle.roohsites.com)"
    doc.core_properties.subject = "Free Word raffle ticket template, 8 per page, numbered 1-200 with SEQ fields. https://raffle.roohsites.com/how-to-number-raffle-tickets-in-word"
    usable = pw - 1.0
    stub_w, tick_w = 1.6, usable - 1.6
    pages = COUNT // PER_PAGE
    row_h = 1.18
    n = 0
    first_par = doc.paragraphs[0] if doc.paragraphs else None
    for pg in range(pages):
        t = doc.add_table(rows=PER_PAGE, cols=2)
        t.alignment = WD_TABLE_ALIGNMENT.CENTER; t.autofit = False
        # fixed layout so Word keeps the widths
        tblPr = t._tbl.tblPr; lay = OxmlElement("w:tblLayout"); lay.set(qn("w:type"), "fixed"); tblPr.append(lay)
        t.columns[0].width, t.columns[1].width = Inches(stub_w), Inches(tick_w)
        for row in t.rows:
            row.height = Inches(row_h); row.height_rule = WD_ROW_HEIGHT_RULE.EXACTLY
            trPr = row._tr.get_or_add_trPr(); cs = OxmlElement("w:cantSplit"); trPr.append(cs)
            n += 1; num = f"{n:03d}"
            stub, tick = row.cells
            stub.width, tick.width = Inches(stub_w), Inches(tick_w)
            for c in (stub, tick): margins(c)
            borders(stub, top=("dashed", 6), bottom=("dashed", 6), left=("dashed", 6), right=("dashed", 6))
            borders(tick, top=("dashed", 6), bottom=("dashed", 6), left=("nil", 0), right=("dashed", 6))
            # Stub (left): it comes first in the document, so it holds the counting field.
            p = para(stub, first=True, after=1); text(p, "STUB No. ", 8, True); add_field(p, 'SEQ ticket \\# "000"', num, 14, True)
            p = para(stub, before=4, after=1); text(p, "Name: ____________", 8.5)
            p = para(stub, before=4, after=1); text(p, "Phone: ___________", 8.5)
            # Ticket (right): repeats the stub's number with \c.
            p = para(tick, first=True, after=0); text(p, "RAFFLE TICKET", 15, True, ACCENT); text(p, "     No. ", 11, True); add_field(p, 'SEQ ticket \\c \\# "000"', num, 20, True)
            p = para(tick, before=3, after=1); text(p, "Event: ______________________________", 9.5)
            p = para(tick, before=3, after=1); text(p, "Prize: ____________________   Drawing: ____________", 9.5)
            p = para(tick, before=3, after=0); text(p, "Price: $_____   ", 9.5, True); text(p, "Keep this ticket. The winner must show the matching number.", 7.5, italic=True)
        if pg < pages - 1:
            br = doc.add_paragraph(); br.paragraph_format.space_after = Pt(0); br.paragraph_format.space_before = Pt(0)
            br.add_run().add_break(__import__("docx").enum.text.WD_BREAK.PAGE)
            for r in br.runs: r.font.size = Pt(1)
    # Word wants a paragraph after the last table
    end = doc.add_paragraph(); end.paragraph_format.space_after = Pt(0); end.paragraph_format.space_before = Pt(0)
    end.add_run().font.size = Pt(1)
    # the empty first paragraph python-docx starts with
    if first_par is not None and not first_par.text:
        first_par._element.getparent().remove(first_par._element)
    path = os.path.join(OUT, f"raffle-tickets-1-200-word-{paper}.docx")
    doc.save(path)
    return path


def preview(letter_docx):
    """First page as sites/ticketrun/img/raffle-tickets-1-200-word.png (needs LibreOffice and pdftoppm; skipped without them)."""
    import shutil, subprocess, tempfile
    if not (shutil.which("soffice") and shutil.which("pdftoppm")):
        print("preview skipped: soffice or pdftoppm not found"); return
    img = os.path.join(OUT, "../img"); os.makedirs(img, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", tmp, letter_docx], check=True, capture_output=True)
        pdf = os.path.join(tmp, os.path.basename(letter_docx)[:-5] + ".pdf")
        subprocess.run(["pdftoppm", "-png", "-r", "50", "-f", "1", "-l", "1", "-singlefile", pdf, os.path.join(img, "raffle-tickets-1-200-word")], check=True)
    print(os.path.join(img, "raffle-tickets-1-200-word.png"))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    paths = [build(paper) for paper in PAPERS]
    for p in paths: print(p)
    preview(paths[0])
