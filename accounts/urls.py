from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    path('', views.accounts_api_home, name='api_home'),
    path('csrf/', views.csrf_token, name='csrf_token'),
    path('signup/', views.signup, name='signup'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('me/', views.current_user, name='current_user'),
    path('profile/', views.profile_detail, name='profile_detail'),
]