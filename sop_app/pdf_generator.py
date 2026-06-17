"""
pdf_generator.py
Generates a PDF report for an SOP using ReportLab.
"""
import io
import base64
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


def generate_sop_pdf(sop) -> bytes:
    """
    Accepts an SOP model instance (with sections + components prefetched).
    Returns PDF bytes.
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
            HRFlowable, Image as RLImage, KeepTogether
        )
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

    except ImportError:
        return b''

    buf = io.BytesIO()

    # Page setup
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2.5*cm, bottomMargin=2.5*cm,
        title=sop.title,
        author=sop.prepared_by.get_full_name() if sop.prepared_by else 'HPCL',
    )

    # Brand colours
    BLUE  = colors.HexColor('#003DA5')
    RED   = colors.HexColor('#E30613')
    LGRAY = colors.HexColor('#F2F4F8')
    DGRAY = colors.HexColor('#0D1B3E')

    styles = getSampleStyleSheet()

    def S(name, **kw):
        s = ParagraphStyle(name, parent=styles['Normal'], **kw)
        return s

    style_h1     = S('H1',  fontSize=18, textColor=DGRAY, fontName='Helvetica-Bold', spaceAfter=6)
    style_h2     = S('H2',  fontSize=13, textColor=BLUE,  fontName='Helvetica-Bold', spaceAfter=4, spaceBefore=12)
    style_h3     = S('H3',  fontSize=11, textColor=DGRAY, fontName='Helvetica-Bold', spaceAfter=3, spaceBefore=8)
    style_body   = S('Body',fontSize=10, leading=15, textColor=DGRAY)
    style_meta   = S('Meta',fontSize=9,  textColor=colors.HexColor('#5A6A8A'))
    style_mono   = S('Mono',fontSize=9,  fontName='Courier', textColor=BLUE)
    style_cap    = S('Cap', fontSize=9,  textColor=colors.HexColor('#5A6A8A'), alignment=TA_CENTER)
    style_header = S('Hdr', fontSize=9,  textColor=colors.white, alignment=TA_CENTER, fontName='Helvetica-Bold')

    story = []

    # ── Cover Header ────────────────────────────────────────────
    header_data = [[
        Paragraph('HPCL — Standard Operating Procedure', style_header),
        Paragraph(sop.sop_number or 'DRAFT', S('MonoW', fontSize=9, fontName='Courier', textColor=colors.white, alignment=TA_RIGHT))
    ]]
    header_tbl = Table(header_data, colWidths=['*', 5*cm])
    header_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BLUE),
        ('TOPPADDING',  (0,0), (-1,-1), 8),
        ('BOTTOMPADDING',(0,0),(-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING',(0,0), (-1,-1), 10),
    ]))
    story.append(header_tbl)
    story.append(Spacer(1, 0.4*cm))

    # ── Title ───────────────────────────────────────────────────
    story.append(Paragraph(sop.title, style_h1))
    story.append(HRFlowable(width='100%', thickness=2, color=RED, spaceAfter=8))

    # ── Metadata table ──────────────────────────────────────────
    meta_rows = [
        ['Refinery',    sop.refinery.name if sop.refinery else '—',
         'Department',  sop.department.name if sop.department else '—'],
        ['Unit',        sop.unit.name if sop.unit else '—',
         'Version',     sop.version],
        ['Prepared By', sop.prepared_by.get_full_name() if sop.prepared_by else '—',
         'Effective Date', str(sop.effective_date) if sop.effective_date else '—'],
        ['Status',      sop.get_status_display(),
         'Date',        str(sop.submitted_date)],
    ]
    meta_cells = []
    for row in meta_rows:
        meta_cells.append([
            Paragraph(row[0], S('LBL', fontSize=8, textColor=colors.HexColor('#5A6A8A'), fontName='Helvetica-Bold')),
            Paragraph(row[1], style_meta),
            Paragraph(row[2], S('LBL', fontSize=8, textColor=colors.HexColor('#5A6A8A'), fontName='Helvetica-Bold')),
            Paragraph(row[3], style_meta),
        ])

    meta_tbl = Table(meta_cells, colWidths=[3*cm, '*', 3*cm, '*'])
    meta_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LGRAY),
        ('ROWBACKGROUNDS', (0,0), (-1,-1), [LGRAY, colors.white]),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#D0D7E3')),
        ('INNERGRID', (0,0), (-1,-1), 0.25, colors.HexColor('#D0D7E3')),
        ('TOPPADDING',  (0,0), (-1,-1), 5),
        ('BOTTOMPADDING',(0,0),(-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(meta_tbl)
    story.append(Spacer(1, 0.6*cm))

    # ── Tags ─────────────────────────────────────────────────────
    if sop.tags:
        story.append(Paragraph('Tags: ' + '  ·  '.join(sop.tags), style_meta))
        story.append(Spacer(1, 0.3*cm))

    story.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#D0D7E3'), spaceAfter=10))

    # ── Sections ─────────────────────────────────────────────────
    for section in sop.sections.all():
        story.append(Paragraph(section.name, style_h2))
        story.append(HRFlowable(width='100%', thickness=1, color=colors.HexColor('#E8EEFA'), spaceAfter=4))

        for comp in section.components.all():
            if comp.type == 'text' and comp.content:
                # Strip basic HTML tags for ReportLab
                text = comp.content
                text = text.replace('<p>', '').replace('</p>', '<br/>')
                text = text.replace('<br>', '<br/>').replace('\n', '<br/>')
                # Bold/italic pass-through supported by Paragraph
                try:
                    story.append(Paragraph(text, style_body))
                except Exception:
                    clean = re.sub(r'<[^>]+>', ' ', text)
                    story.append(Paragraph(clean, style_body))
                story.append(Spacer(1, 0.2*cm))

            elif comp.type == 'table' and comp.table_rows:
                rows = comp.table_rows
                if rows:
                    tbl_data = []
                    for i, row in enumerate(rows):
                        tbl_data.append([Paragraph(str(cell), S('TC', fontSize=9,
                            fontName='Helvetica-Bold' if i == 0 else 'Helvetica')) for cell in row])

                    tbl = Table(tbl_data, repeatRows=1)
                    tbl.setStyle(TableStyle([
                        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#E8EEFA')),
                        ('TEXTCOLOR',  (0,0), (-1,0), DGRAY),
                        ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
                        ('FONTSIZE',   (0,0), (-1,-1), 9),
                        ('BOX',        (0,0), (-1,-1), 0.5, colors.HexColor('#D0D7E3')),
                        ('INNERGRID',  (0,0), (-1,-1), 0.25, colors.HexColor('#D0D7E3')),
                        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LGRAY]),
                        ('TOPPADDING',  (0,0), (-1,-1), 4),
                        ('BOTTOMPADDING',(0,0),(-1,-1), 4),
                        ('LEFTPADDING', (0,0), (-1,-1), 6),
                    ]))

                    num_cols = max(len(r) for r in rows) if rows else 1
                    col_w = (doc.width) / num_cols
                    tbl._argW = [col_w] * num_cols

                    story.append(tbl)
                    story.append(Spacer(1, 0.3*cm))

            elif comp.type in ('image', 'chart') and comp.image_url:
                try:
                    src = comp.image_url
                    if src.startswith('data:'):
                        # base64 inline
                        header, b64data = src.split(',', 1)
                        img_bytes = base64.b64decode(b64data)
                        img_buf = io.BytesIO(img_bytes)
                        rl_img = RLImage(img_buf, width=14*cm, height=8*cm, kind='proportional')
                    else:
                        rl_img = RLImage(src, width=14*cm, height=8*cm, kind='proportional')

                    story.append(rl_img)
                    if comp.caption or comp.chart_title:
                        story.append(Paragraph(comp.caption or comp.chart_title, style_cap))
                    story.append(Spacer(1, 0.3*cm))
                except Exception as img_err:
                    logger.warning(f'Could not embed image: {img_err}')

            # Weight badge
            if comp.weight:
                story.append(Paragraph(f'<font color="#5A6A8A" size="8">Weight: {comp.weight}</font>', style_body))

        story.append(Spacer(1, 0.4*cm))

    # ── Approval Chain ───────────────────────────────────────────
    approval_steps = list(sop.approval_chain.all())
    if approval_steps:
        story.append(Paragraph('Approval Chain', style_h2))
        ap_data = [['Step', 'Role', 'Approver', 'Status', 'Date', 'Comment']]
        for step in approval_steps:
            ap_data.append([
                str(step.step),
                step.role,
                step.approver.get_full_name() if step.approver else '—',
                step.get_status_display(),
                step.timestamp.strftime('%d %b %Y') if step.timestamp else 'Pending',
                step.comment or '—',
            ])
        ap_tbl = Table(ap_data, repeatRows=1,
                       colWidths=[1*cm, 3.5*cm, 3.5*cm, 2.5*cm, 2.5*cm, '*'])
        ap_tbl.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), BLUE),
            ('TEXTCOLOR',  (0,0), (-1,0), colors.white),
            ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE',   (0,0), (-1,-1), 8),
            ('BOX',        (0,0), (-1,-1), 0.5, colors.HexColor('#D0D7E3')),
            ('INNERGRID',  (0,0), (-1,-1), 0.25, colors.HexColor('#D0D7E3')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LGRAY]),
            ('TOPPADDING',  (0,0), (-1,-1), 4),
            ('BOTTOMPADDING',(0,0),(-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(ap_tbl)
        story.append(Spacer(1, 0.5*cm))

    # ── Footer note ──────────────────────────────────────────────
    story.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#D0D7E3')))
    story.append(Paragraph(
        f'Generated: {datetime.now().strftime("%d %b %Y %H:%M")} | HPCL SOP Management Portal',
        S('Foot', fontSize=8, textColor=colors.HexColor('#5A6A8A'), alignment=TA_CENTER)
    ))

    doc.build(story)
    return buf.getvalue()


import re  # needed for HTML stripping above
