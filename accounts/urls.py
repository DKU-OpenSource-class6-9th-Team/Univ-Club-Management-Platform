from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    path('', views.accounts_api_home, name='api_home'),
    path('signup/', views.signup, name='signup'),
    path('login/', views.login_view, name='login'),
]