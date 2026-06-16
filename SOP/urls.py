"""
URL configuration for SOP project.
"""
from django.contrib import admin
from django.urls import path, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    # Serve the SPA — catch-all for non-admin, non-static, non-api routes
    re_path(r'^(?!admin|static|api).*$',
            TemplateView.as_view(template_name='index.html'),
            name='spa'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0])
