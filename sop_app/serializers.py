import json
from django.contrib.auth.models import User
from .models import SOP, SOPSection, SOPComponent, ApprovalStep, Notification, Refinery, Department, ProcessUnit


def serialize_component(comp):
    import json as _json
    steps = None
    if comp.type == 'step':
        try:
            steps = _json.loads(comp.content) if comp.content else []
        except Exception:
            steps = comp.content.split('\n') if comp.content else []

    return {
        'id': comp.id,
        'type': comp.type,
        'order': comp.order,
        'weight': comp.weight,
        'content': comp.content,
        'steps': steps,
        'src': comp.image_url or None,
        'altText': comp.alt_text,
        'caption': comp.caption,
        'chartTitle': comp.chart_title,
        'chartDesc': comp.chart_desc,
        'rows': comp.table_rows if comp.type == 'table' else None,
    }


def serialize_section(section):
    return {
        'id': section.id,
        'title': section.name,
        'order': section.order,
        'components': [serialize_component(c) for c in section.components.all()],
    }


def serialize_approval_step(step):
    return {
        'step': step.step,
        'role': step.role,
        'user': step.approver.get_full_name() if step.approver else '',
        'status': step.status,
        'timestamp': step.timestamp.isoformat() if step.timestamp else None,
        'comment': step.comment,
        'approval_type': step.approval_type,
    }


def serialize_sop_list(sop):
    return {
        'id': sop.id,
        'sop_number': sop.sop_number,
        'title': sop.title,
        'refinery': sop.refinery.name if sop.refinery else '',
        'department': sop.department.name if sop.department else '',
        'unit': sop.unit.name if sop.unit else '',
        'status': sop.status,
        'submitted_by': sop.prepared_by.get_full_name() if sop.prepared_by else '',
        'date': sop.submitted_date.isoformat() if sop.submitted_date else '',
        'version': sop.version,
    }


def serialize_sop_detail(sop):
    data = serialize_sop_list(sop)
    data.update({
        'effective_date': sop.effective_date.isoformat() if sop.effective_date else '',
        'prepared_by': sop.prepared_by.get_full_name() if sop.prepared_by else '',
        'tags': sop.tags,
        'sections': [serialize_section(s) for s in sop.sections.all()],
        'approval_chain': [serialize_approval_step(a) for a in sop.approval_chain.all()],
        'revision_history': [
            {'version': '1.0', 'changed_by': sop.prepared_by.get_full_name() if sop.prepared_by else '', 'date': sop.submitted_date.isoformat(), 'summary': 'Initial creation'}
        ],
    })
    return data


def serialize_notification(notif):
    return {
        'id': notif.id,
        'type': notif.type,
        'title': notif.title,
        'message': notif.message,
        'sop_id': notif.sop_id,
        'sop_number': notif.sop.sop_number if notif.sop else None,
        'is_read': notif.is_read,
        'created_at': notif.created_at.isoformat(),
    }
