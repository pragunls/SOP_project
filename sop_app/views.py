import json
import logging

from django.http import JsonResponse, HttpResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth.models import User
from django.db import transaction
from django.shortcuts import get_object_or_404

from .models import SOP, SOPSection, SOPComponent, ApprovalStep, Notification, Refinery, Department, ProcessUnit
from .serializers import (
    serialize_sop_list, serialize_sop_detail,
    serialize_notification,
)
from .document_parser import parse_document
from .pdf_generator import generate_sop_pdf
from .docx_generator import generate_sop_docx

logger = logging.getLogger(__name__)

def json_response(data, status=200):
    return JsonResponse(data, status=status, safe=False)

def error_response(message, status=400):
    return JsonResponse({'error': message}, status=status)

def get_request_user(request):
    """Return the authenticated user or the first superuser (dev fallback)."""
    if request.user.is_authenticated:
        return request.user
    return User.objects.filter(is_superuser=True).first() or User.objects.first()

# Reference Data
class RefineryListView(View):
    def get(self, request):
        data = list(Refinery.objects.values('id', 'code', 'name', 'state'))
        return json_response(data)

class DepartmentListView(View):
    def get(self, request):
        data = list(Department.objects.values('id', 'code', 'name'))
        return json_response(data)

class ProcessUnitListView(View):
    def get(self, request):
        data = list(ProcessUnit.objects.values('id', 'code', 'name', 'full_name', 'description'))
        return json_response(data)

# SOP CRUD
@method_decorator(csrf_exempt, name='dispatch')
class SOPListCreateView(View):
    def get(self, request):
        qs = SOP.objects.select_related('refinery', 'department', 'unit', 'prepared_by')

        # Filters
        search = request.GET.get('search', '').strip()
        refinery = request.GET.get('refinery', '')
        department = request.GET.get('department', '')
        status = request.GET.get('status', '')

        if search:
            qs = qs.filter(title__icontains=search) | qs.filter(sop_number__icontains=search)
        if refinery:
            qs = qs.filter(refinery__name=refinery)
        if department:
            qs = qs.filter(department__name=department)
        if status:
            qs = qs.filter(status=status)

        # Filter by current user's SOPs
        mine = request.GET.get('mine', '')
        if mine:
            current_user = get_request_user(request)
            if current_user:
                qs = qs.filter(prepared_by=current_user)

        # Stats
        from django.db.models import Count
        from django.utils import timezone
        this_month = timezone.now().replace(day=1).date()

        stats = {
            'total': SOP.objects.count(),
            'pending': SOP.objects.filter(status='review').count(),
            'approved_month': SOP.objects.filter(status='approved', submitted_date__gte=this_month).count(),
            'rejected': SOP.objects.filter(status='rejected').count(),
        }

        sops = [serialize_sop_list(s) for s in qs.distinct()]
        return json_response({'results': sops, 'count': len(sops), 'stats': stats})

    def post(self, request):
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return error_response('Invalid JSON')

        user = get_request_user(request)

        with transaction.atomic():
            # Resolve FK refs
            refinery = Refinery.objects.filter(code=data.get('refinery', {}).get('code', '')).first()
            department = Department.objects.filter(code=data.get('department', {}).get('code', '')).first()
            unit = ProcessUnit.objects.filter(code=data.get('unit', {}).get('code', '')).first()

            sop = SOP.objects.create(
                sop_number=data.get('sop_number', ''),
                title=data.get('title', 'Untitled'),
                version=data.get('version', '1.0'),
                status=data.get('status', 'draft'),
                refinery=refinery,
                department=department,
                unit=unit,
                prepared_by=user,
                effective_date=data.get('effective_date') or None,
            )
            sop.tags = data.get('tags', [])
            sop.save()

            # Create sections + components
            for i, sec_data in enumerate(data.get('sections', [])):
                section = SOPSection.objects.create(
                    sop=sop, name=sec_data.get('name', 'Section'), order=i
                )
                for j, comp_data in enumerate(sec_data.get('components', [])):
                    comp = SOPComponent(section=section, order=j)
                    _fill_component(comp, comp_data)
                    comp.save()

            # Approval chain
            for step_data in data.get('approvalChain', []):
                approver = None
                user_name = step_data.get('user', '')
                if user_name:
                    parts = user_name.split()
                    if len(parts) >= 2:
                        approver = User.objects.filter(
                            first_name__iexact=parts[0], last_name__iexact=parts[-1]
                        ).first()

                ApprovalStep.objects.create(
                    sop=sop,
                    step=step_data.get('step', 1),
                    role=step_data.get('role', ''),
                    approver=approver,
                    approval_type=step_data.get('type', 'sequential'),
                    status='pending',
                )

        return json_response(serialize_sop_list(sop), status=201)

def _fill_component(comp, data):
    import json as _json
    comp.type = data.get('type', 'text')
    comp.weight = int(data.get('weight', 0) or 0)
    # For 'step' type, store steps list as JSON in content field
    if comp.type == 'step':
        steps = data.get('steps', [])
        comp.content = _json.dumps([s for s in steps if s and s.strip()])
    else:
        comp.content = data.get('content', '')
    comp.image_url  = data.get('src', '') or ''
    comp.alt_text   = data.get('altText', '') or ''
    comp.caption    = data.get('caption', '') or ''
    comp.chart_title = data.get('chartTitle', '') or ''
    comp.chart_desc  = data.get('chartDesc', '') or ''
    if data.get('rows'):
        comp.table_rows = data['rows']

@method_decorator(csrf_exempt, name='dispatch')
class SOPDetailView(View):
    def get(self, request, pk):
        sop = get_object_or_404(
            SOP.objects.select_related('refinery', 'department', 'unit', 'prepared_by')
                       .prefetch_related('sections__components', 'approval_chain__approver'),
            pk=pk
        )
        return json_response(serialize_sop_detail(sop))

    def put(self, request, pk):
        sop = get_object_or_404(SOP, pk=pk)
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return error_response('Invalid JSON')

        sop.title = data.get('title', sop.title)
        sop.status = data.get('status', sop.status)
        sop.version = data.get('version', sop.version)
        sop.tags = data.get('tags', sop.tags)
        if data.get('effective_date'):
            sop.effective_date = data['effective_date']
        sop.save()
        return json_response(serialize_sop_detail(sop))

    def patch(self, request, pk):
        return self.put(request, pk)

# SOP Actions
@method_decorator(csrf_exempt, name='dispatch')
class SOPSubmitView(View):
    def post(self, request, pk):
        sop = get_object_or_404(SOP, pk=pk)
        sop.status = 'review'
        sop.save()

        # Notify first approver(s)
        first_steps = sop.approval_chain.filter(step=1)
        for step in first_steps:
            if step.approver:
                Notification.objects.create(
                    user=step.approver,
                    type='approval_request',
                    title=f'Approval required: {sop.sop_number}',
                    message=f'{sop.prepared_by.get_full_name() if sop.prepared_by else "Someone"} submitted "{sop.title}" for your approval.',
                    sop=sop,
                )

        return json_response({'success': True, 'status': sop.status})

@method_decorator(csrf_exempt, name='dispatch')
class SOPApproveView(View):
    def post(self, request, pk):
        from django.utils import timezone
        sop = get_object_or_404(SOP, pk=pk)
        user = get_request_user(request)

        try:
            data = json.loads(request.body)
        except Exception:
            data = {}

        # Find the pending step for this user
        step = sop.approval_chain.filter(
            status='pending', approver=user
        ).order_by('step').first()

        if not step:
            # For dev: approve the first pending step
            step = sop.approval_chain.filter(status='pending').order_by('step').first()

        if step:
            step.status = 'approved'
            step.comment = data.get('comment', '')
            step.timestamp = timezone.now()
            step.save()

        # Check if all approved
        pending_count = sop.approval_chain.filter(status='pending').count()
        if pending_count == 0:
            sop.status = 'approved'
            sop.save()
            # Notify submitter
            if sop.prepared_by:
                Notification.objects.create(
                    user=sop.prepared_by,
                    type='approved',
                    title=f'SOP Approved: {sop.sop_number}',
                    message=f'Your SOP "{sop.title}" has been approved.',
                    sop=sop,
                )
        else:
            # Notify next approver (sequential)
            if step:
                next_step = sop.approval_chain.filter(step=step.step + 1, status='pending').first()
                if next_step and next_step.approver:
                    Notification.objects.create(
                        user=next_step.approver,
                        type='approval_request',
                        title=f'Approval required: {sop.sop_number}',
                        message=f'Step {step.step} approved. Your review is required.',
                        sop=sop,
                    )

        return json_response({'success': True, 'status': sop.status})

@method_decorator(csrf_exempt, name='dispatch')
class SOPRejectView(View):
    def post(self, request, pk):
        from django.utils import timezone
        sop = get_object_or_404(SOP, pk=pk)
        user = get_request_user(request)

        try:
            data = json.loads(request.body)
        except Exception:
            data = {}

        comment = data.get('comment', '')
        if not comment:
            return error_response('Rejection comment is required', 400)

        step = sop.approval_chain.filter(status='pending').order_by('step').first()
        if step:
            step.status = 'rejected'
            step.comment = comment
            step.timestamp = timezone.now()
            step.save()

        sop.status = 'rejected'
        sop.save()

        # Notify submitter
        if sop.prepared_by:
            Notification.objects.create(
                user=sop.prepared_by,
                type='rejected',
                title=f'SOP Rejected: {sop.sop_number}',
                message=f'Your SOP "{sop.title}" was rejected. Comment: {comment}',
                sop=sop,
            )

        return json_response({'success': True, 'status': sop.status})

class SOPDocxView(View):
    def get(self, request, pk):
        sop = get_object_or_404(
            SOP.objects.select_related('refinery', 'department', 'unit', 'prepared_by')
                       .prefetch_related('sections__components', 'approval_chain__approver'),
            pk=pk
        )
        try:
            docx_bytes = generate_sop_docx(sop)
            if not docx_bytes:
                return error_response('DOCX generation failed', 500)
            response = HttpResponse(
                docx_bytes,
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )
            safe_name = sop.sop_number.replace('/', '-') if sop.sop_number else f'sop-{pk}'
            response['Content-Disposition'] = f'attachment; filename="{safe_name}.docx"'
            return response
        except Exception as e:
            logger.error(f'DOCX generation error: {e}')
            return error_response(str(e), 500)

# PDF Download
class SOPPDFView(View):
    def get(self, request, pk):
        sop = get_object_or_404(
            SOP.objects.select_related('refinery', 'department', 'unit', 'prepared_by')
                       .prefetch_related('sections__components', 'approval_chain__approver'),
            pk=pk
        )
        try:
            pdf_bytes = generate_sop_pdf(sop)
            if not pdf_bytes:
                return error_response('PDF generation failed', 500)
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            safe_name = sop.sop_number.replace('/', '-') if sop.sop_number else f'sop-{pk}'
            response['Content-Disposition'] = f'attachment; filename="{safe_name}.pdf"'
            return response
        except Exception as e:
            logger.error(f'PDF generation error: {e}')
            return error_response(str(e), 500)

# Document Parse (PDF/DOCX upload)
@method_decorator(csrf_exempt, name='dispatch')
class DocumentParseView(View):
    """
    POST multipart/form-data with file=<PDF or DOCX>
    Returns extracted sections + components as JSON.
    """
    def post(self, request):
        uploaded = request.FILES.get('file')
        if not uploaded:
            return error_response('No file uploaded')

        filename = uploaded.name
        allowed = ('.pdf', '.docx', '.doc')
        if not any(filename.lower().endswith(ext) for ext in allowed):
            return error_response('Only PDF and DOCX files are supported')

        if uploaded.size > 20 * 1024 * 1024:  # 20 MB
            return error_response('File too large (max 20 MB)')

        file_bytes = uploaded.read()
        result = parse_document(file_bytes, filename)
        return json_response(result)

# Notifications
@method_decorator(csrf_exempt, name='dispatch')
class NotificationListView(View):
    def get(self, request):
        user = get_request_user(request)
        notifs = Notification.objects.filter(user=user).select_related('sop')[:50]
        data = [serialize_notification(n) for n in notifs]
        unread = sum(1 for n in notifs if not n.is_read)
        return json_response({'notifications': data, 'unread_count': unread})

    def patch(self, request):
        """Mark all as read."""
        user = get_request_user(request)
        Notification.objects.filter(user=user, is_read=False).update(is_read=True)
        return json_response({'success': True})

@method_decorator(csrf_exempt, name='dispatch')
class NotificationMarkReadView(View):
    def patch(self, request, pk):
        user = get_request_user(request)
        notif = get_object_or_404(Notification, pk=pk, user=user)
        notif.is_read = True
        notif.save()
        return json_response({'success': True})

# Pending Approvals
class PendingApprovalsView(View):
    def get(self, request):
        user = get_request_user(request)
        steps = ApprovalStep.objects.filter(
            approver=user, status='pending'
        ).select_related('sop__refinery', 'sop__department', 'sop__unit', 'sop__prepared_by')

        data = []
        for step in steps:
            sop = step.sop
            data.append({
                'id': sop.id,
                'title': sop.title,
                'sop_number': sop.sop_number,
                'submitter': sop.prepared_by.get_full_name() if sop.prepared_by else '—',
                'unit': sop.unit.name if sop.unit else '—',
                'refinery': sop.refinery.name if sop.refinery else '—',
                'step': step.step,
                'role': step.role,
                'time': sop.submitted_date.isoformat() if sop.submitted_date else '',
            })

        return json_response(data)

# Dashboard Stats
class DashboardStatsView(View):
    def get(self, request):
        from django.utils import timezone
        this_month = timezone.now().replace(day=1).date()
        return json_response({
            'total': SOP.objects.count(),
            'pending': SOP.objects.filter(status='review').count(),
            'approved_month': SOP.objects.filter(status='approved', submitted_date__gte=this_month).count(),
            'rejected': SOP.objects.filter(status='rejected').count(),
        })
