"""
URL configuration for SOP project.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.views.decorators.csrf import ensure_csrf_cookie
from django.conf import settings
from django.conf.urls.static import static

# Wrap the SPA template view so Django always sets the CSRF cookie
spa_view = ensure_csrf_cookie(TemplateView.as_view(template_name='index.html'))

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('sop_app.urls')),
    re_path(r'^(?!admin|static|api|media).*$', spa_view, name='spa'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL,  document_root=settings.STATICFILES_DIRS[0])
    urlpatterns += static(settings.MEDIA_URL,   document_root=settings.MEDIA_ROOT)
