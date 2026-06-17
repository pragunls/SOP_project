"""
URL configuration for SOP project.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),

    # API routes
    path('api/', include('sop_app.urls')),

    # Serve SPA for all other routes
    re_path(r'^(?!admin|static|api|media).*$',
            TemplateView.as_view(template_name='index.html'),
            name='spa'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL,  document_root=settings.STATICFILES_DIRS[0])
    urlpatterns += static(settings.MEDIA_URL,   document_root=settings.MEDIA_ROOT)
