from django.contrib import admin
from .models import SOP, SOPSection, SOPComponent, ApprovalStep, Notification, Refinery, Department, ProcessUnit

class SOPComponentInline(admin.TabularInline):
    model = SOPComponent
    extra = 0
    fields = ('type', 'order', 'weight', 'content')

class SOPSectionInline(admin.TabularInline):
    model = SOPSection
    extra = 0

class ApprovalStepInline(admin.TabularInline):
    model = ApprovalStep
    extra = 0

@admin.register(SOP)
class SOPAdmin(admin.ModelAdmin):
    list_display  = ('sop_number', 'title', 'refinery', 'department', 'unit', 'status', 'submitted_date')
    list_filter   = ('status', 'refinery', 'department')
    search_fields = ('sop_number', 'title')
    inlines       = [SOPSectionInline, ApprovalStepInline]
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Refinery)
class RefineryAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'state')

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('code', 'name')

@admin.register(ProcessUnit)
class ProcessUnitAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'full_name')

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'type', 'title', 'is_read', 'created_at')
    list_filter  = ('type', 'is_read')
