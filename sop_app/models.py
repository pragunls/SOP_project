from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
import json


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('admin',   'Admin'),
        ('manager', 'Manager'),
        ('user',    'User'),
    ]

    user        = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role        = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    managed_by  = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='manages_users'
    )
    department  = models.ForeignKey(
        'Department', on_delete=models.SET_NULL, null=True, blank=True
    )
    refinery    = models.ForeignKey(
        'Refinery', on_delete=models.SET_NULL, null=True, blank=True
    )
    phone       = models.CharField(max_length=20, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.role})"

    @property
    def initials(self):
        name = self.user.get_full_name()
        parts = name.split()
        if len(parts) >= 2:
            return (parts[0][0] + parts[-1][0]).upper()
        return name[:2].upper() if name else self.user.username[:2].upper()


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)

class Refinery(models.Model):
    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=100)
    state = models.CharField(max_length=100)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Refineries"

class Department(models.Model):
    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class ProcessUnit(models.Model):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=50)
    full_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    def __str__(self):
        return f"{self.name} — {self.full_name}"

class SOP(models.Model):
    STATUS_CHOICES = [
        ('draft',    'Draft'),
        ('review',   'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    sop_number     = models.CharField(max_length=60, unique=True, blank=True)
    title          = models.CharField(max_length=300)
    version        = models.CharField(max_length=10, default='1.0')
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    refinery       = models.ForeignKey(Refinery,   on_delete=models.SET_NULL, null=True, blank=True)
    department     = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    unit           = models.ForeignKey(ProcessUnit,on_delete=models.SET_NULL, null=True, blank=True)

    prepared_by    = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                       related_name='prepared_sops')
    effective_date = models.DateField(null=True, blank=True)
    submitted_date = models.DateField(auto_now_add=True)

    # JSON-encoded list of tag strings
    _tags          = models.TextField(default='[]', db_column='tags')

    # Uploaded source document (PDF / DOCX)
    source_document = models.FileField(upload_to='sop_docs/', null=True, blank=True)

    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    @property
    def tags(self):
        try:
            return json.loads(self._tags)
        except Exception:
            return []

    @tags.setter
    def tags(self, value):
        self._tags = json.dumps(value if isinstance(value, list) else [])

    def __str__(self):
        return f"{self.sop_number} — {self.title}"

    class Meta:
        ordering = ['-submitted_date']

class SOPSection(models.Model):
    sop      = models.ForeignKey(SOP, on_delete=models.CASCADE, related_name='sections')
    name     = models.CharField(max_length=200)
    order    = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.sop.sop_number} / {self.name}"

    class Meta:
        ordering = ['order']

class SOPComponent(models.Model):
    TYPE_CHOICES = [
        ('text',  'Text'),
        ('step',  'Numbered Steps'),
        ('chart', 'Chart'),
        ('image', 'Image'),
        ('table', 'Table'),
    ]

    section    = models.ForeignKey(SOPSection, on_delete=models.CASCADE, related_name='components')
    type       = models.CharField(max_length=10, choices=TYPE_CHOICES)
    order      = models.PositiveIntegerField(default=0)
    weight     = models.PositiveSmallIntegerField(default=0)  # 0–9

    # Text component
    content    = models.TextField(blank=True)

    # Image / Chart
    image_file  = models.ImageField(upload_to='sop_images/', null=True, blank=True)
    image_url   = models.TextField(blank=True)   # base64 or URL
    alt_text    = models.CharField(max_length=300, blank=True)
    caption     = models.CharField(max_length=300, blank=True)
    chart_title = models.CharField(max_length=300, blank=True)
    chart_desc  = models.TextField(blank=True)

    # Table — JSON encoded 2D array
    _table_rows = models.TextField(default='[]', db_column='table_rows')

    @property
    def table_rows(self):
        try:
            return json.loads(self._table_rows)
        except Exception:
            return []

    @table_rows.setter
    def table_rows(self, value):
        self._table_rows = json.dumps(value if isinstance(value, list) else [])

    class Meta:
        ordering = ['order']

class ApprovalStep(models.Model):
    STATUS_CHOICES = [
        ('pending',  'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    sop        = models.ForeignKey(SOP, on_delete=models.CASCADE, related_name='approval_chain')
    step       = models.PositiveIntegerField()
    role       = models.CharField(max_length=100)
    approver   = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='approval_steps')
    approval_type = models.CharField(max_length=20, default='sequential',
                                     choices=[('sequential','Sequential'),('parallel','Parallel')])
    status     = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    comment    = models.TextField(blank=True)
    timestamp  = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['step']

class Notification(models.Model):
    TYPE_CHOICES = [
        ('approval_request', 'Approval Request'),
        ('approved',         'SOP Approved'),
        ('rejected',         'SOP Rejected'),
        ('draft_reminder',   'Draft Reminder'),
        ('info',             'Info'),
    ]

    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type       = models.CharField(max_length=30, choices=TYPE_CHOICES, default='info')
    title      = models.CharField(max_length=300)
    message    = models.TextField(blank=True)
    sop        = models.ForeignKey(SOP, on_delete=models.CASCADE, null=True, blank=True)
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} — {self.title}"
