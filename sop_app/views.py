import json
import logging

from django.http import JsonResponse, HttpResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db import transaction
from django.shortcuts import get_object_or_404

from .models import SOP, SOPSection, SOPComponent, ApprovalStep, Notification, Refinery, Department, ProcessUnit, UserProfile
from .serializers import (
    serialize_sop_list, serialize_sop_detail,
    serialize_notification, serialize_user_profile,
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
    """Return the authenticated user or first user as dev fallback."""
    if request.user.is_authenticated:
        return request.user
    return User.objects.filter(is_superuser=True).first() or User.objects.first()


def get_user_role(user):
    """Return the portal role for a user (admin/manager/user)."""
    if not user or not user.is_authenticated:
        return None
    try:
        return user.profile.role
    except Exception:
        return 'user'


def require_role(*roles):
    """Return error if user's role is not in allowed roles."""
    def check(request):
        role = get_user_role(get_request_user(request))
        if role not in roles:
            return JsonResponse({'error': 'Permission denied'}, status=403)
        return None
    return check

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


# Auth — Login / Logout / Me
@method_decorator(csrf_exempt, name='dispatch')
class LoginView(View):
    def post(self, request):
        try:
            data = json.loads(request.body)
        except Exception:
            return error_response('Invalid JSON')

        username = data.get('username', '').strip()
        password = data.get('password', '').strip()

        if not username or not password:
            return error_response('Username and password are required')

        user = authenticate(request, username=username, password=password)
        if not user:
            return error_response('Invalid username or password', 401)

        if not user.is_active:
            return error_response('Account is disabled', 401)

        login(request, user)
        return json_response(_serialize_me(user))


class LogoutView(View):
    def post(self, request):
        logout(request)
        return json_response({'success': True})


class MeView(View):
    def get(self, request):
        user = get_request_user(request)
        if not user:
            return error_response('Not authenticated', 401)
        return json_response(_serialize_me(user))


def _serialize_me(user):
    try:
        profile = user.profile
        role = profile.role
        dept = profile.department.name if profile.department else ''
        refinery = profile.refinery.name if profile.refinery else ''
    except Exception:
        role = 'admin' if user.is_superuser else 'user'
        dept = ''
        refinery = ''

    name = user.get_full_name() or user.username
    parts = name.split()
    initials = (parts[0][0] + parts[-1][0]).upper() if len(parts) >= 2 else name[:2].upper()

    return {
        'id':        user.id,
        'username':  user.username,
        'name':      name,
        'email':     user.email,
        'initials':  initials,
        'role':      role,
        'department': dept,
        'refinery':  refinery,
    }


# User Management (Admin + Manager)
@method_decorator(csrf_exempt, name='dispatch')
class UserListCreateView(View):
    def get(self, request):
        current = get_request_user(request)
        role = get_user_role(current)

        if role == 'admin':
            users = User.objects.select_related('profile').all().order_by('first_name')
        elif role == 'manager':
            # Manager sees users they manage
            users = User.objects.select_related('profile').filter(
                profile__managed_by=current
            ).order_by('first_name')
        else:
            return error_response('Permission denied', 403)

        return json_response([serialize_user_profile(u) for u in users])

    def post(self, request):
        current = get_request_user(request)
        actor_role = get_user_role(current)

        if actor_role not in ('admin', 'manager'):
            return error_response('Permission denied', 403)

        try:
            data = json.loads(request.body)
        except Exception:
            return error_response('Invalid JSON')

        username  = data.get('username', '').strip()
        password  = data.get('password', '').strip()
        first     = data.get('first_name', '').strip()
        last      = data.get('last_name', '').strip()
        email     = data.get('email', '').strip()
        new_role  = data.get('role', 'user')
        dept_code = data.get('department', '')
        ref_code  = data.get('refinery', '')

        if not username or not password:
            return error_response('Username and password are required')

        # Admin can create managers and users; Manager can only create users
        if actor_role == 'manager' and new_role != 'user':
            return error_response('Managers can only create user accounts', 403)

        if User.objects.filter(username=username).exists():
            return error_response(f'Username "{username}" already exists')

        with transaction.atomic():
            user = User.objects.create_user(
                username=username, password=password,
                first_name=first, last_name=last, email=email
            )
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.role = new_role
            profile.managed_by = current
            if dept_code:
                profile.department = Department.objects.filter(code=dept_code).first()
            if ref_code:
                profile.refinery = Refinery.objects.filter(code=ref_code).first()
            profile.save()

        return json_response(serialize_user_profile(user), status=201)


@method_decorator(csrf_exempt, name='dispatch')
class UserDetailView(View):
    def get(self, request, pk):
        current = get_request_user(request)
        role = get_user_role(current)
        user = get_object_or_404(User.objects.select_related('profile'), pk=pk)

        # Admin sees anyone; manager sees their users; user sees themselves
        if role == 'admin' or (role == 'manager' and user.profile.managed_by == current) or user == current:
            return json_response(serialize_user_profile(user))
        return error_response('Permission denied', 403)

    def put(self, request, pk):
        current = get_request_user(request)
        actor_role = get_user_role(current)
        user = get_object_or_404(User.objects.select_related('profile'), pk=pk)

        if actor_role not in ('admin', 'manager'):
            return error_response('Permission denied', 403)

        if actor_role == 'manager' and user.profile.managed_by != current:
            return error_response('Permission denied', 403)

        try:
            data = json.loads(request.body)
        except Exception:
            return error_response('Invalid JSON')

        if data.get('first_name'):  user.first_name  = data['first_name']
        if data.get('last_name'):   user.last_name   = data['last_name']
        if data.get('email'):       user.email       = data['email']
        if data.get('password'):    user.set_password(data['password'])
        user.save()

        profile = user.profile
        if data.get('role') and actor_role == 'admin':
            profile.role = data['role']
        if data.get('department'):
            profile.department = Department.objects.filter(code=data['department']).first()
        if data.get('refinery'):
            profile.refinery = Refinery.objects.filter(code=data['refinery']).first()
        profile.save()

        return json_response(serialize_user_profile(user))

    def delete(self, request, pk):
        current = get_request_user(request)
        actor_role = get_user_role(current)
        user = get_object_or_404(User, pk=pk)

        if actor_role == 'admin':
            pass  # can delete anyone except themselves
        elif actor_role == 'manager':
            try:
                if user.profile.managed_by != current:
                    return error_response('Permission denied', 403)
            except Exception:
                return error_response('Permission denied', 403)
        else:
            return error_response('Permission denied', 403)

        if user == current:
            return error_response('Cannot delete your own account', 400)

        user.delete()
        return json_response({'success': True})
