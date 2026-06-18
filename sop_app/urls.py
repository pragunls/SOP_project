from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('auth/login/',  views.LoginView.as_view(),  name='login'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/me/',     views.MeView.as_view(),     name='me'),

    # User management
    path('users/',         views.UserListCreateView.as_view(), name='user-list-create'),
    path('users/<int:pk>/', views.UserDetailView.as_view(),   name='user-detail'),

    # Reference data
    path('refineries/',   views.RefineryListView.as_view(),    name='refineries'),
    path('departments/',  views.DepartmentListView.as_view(),  name='departments'),
    path('units/',        views.ProcessUnitListView.as_view(), name='units'),

    # Dashboard stats
    path('stats/',        views.DashboardStatsView.as_view(),  name='stats'),

    # SOPs
    path('sops/',                  views.SOPListCreateView.as_view(),   name='sop-list-create'),
    path('sops/<int:pk>/',         views.SOPDetailView.as_view(),       name='sop-detail'),
    path('sops/<int:pk>/submit/',  views.SOPSubmitView.as_view(),       name='sop-submit'),
    path('sops/<int:pk>/approve/', views.SOPApproveView.as_view(),      name='sop-approve'),
    path('sops/<int:pk>/reject/',  views.SOPRejectView.as_view(),       name='sop-reject'),
    path('sops/<int:pk>/pdf/',     views.SOPPDFView.as_view(),          name='sop-pdf'),
    path('sops/<int:pk>/docx/',    views.SOPDocxView.as_view(),         name='sop-docx'),

    # Document parsing
    path('parse-document/',        views.DocumentParseView.as_view(),   name='parse-document'),

    # Notifications
    path('notifications/',               views.NotificationListView.as_view(),      name='notifications'),
    path('notifications/<int:pk>/read/', views.NotificationMarkReadView.as_view(),  name='notification-read'),

    # Pending approvals
    path('pending-approvals/',     views.PendingApprovalsView.as_view(), name='pending-approvals'),
]
