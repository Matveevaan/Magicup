# tests/test_urls.py
from django.test import SimpleTestCase
from django.urls import reverse, resolve
from accounts import views


class UrlsTest(SimpleTestCase):
    def test_register_url(self):
        url = reverse('accounts:register')
        self.assertEqual(resolve(url).func.view_class, views.RegisterView)
    
    def test_login_url(self):
        url = reverse('accounts:login')
        self.assertEqual(resolve(url).func.view_class, views.LoginView)
    
    def test_logout_url(self):
        url = reverse('accounts:logout')
        self.assertEqual(resolve(url).func.view_class, views.LogoutView)
    
    def test_profile_url(self):
        url = reverse('accounts:profile')
        self.assertEqual(resolve(url).func.view_class, views.ProfileView)
    
    def test_find_by_barcode_url(self):
        url = reverse('accounts:find_by_barcode')
        self.assertEqual(resolve(url).func.view_class, views.FindByBarcodeView)
    
    def test_process_purchase_url(self):
        url = reverse('accounts:process_purchase')
        self.assertEqual(resolve(url).func.view_class, views.ProcessPurchaseView)
    
    def test_my_purchases_url(self):
        url = reverse('accounts:my_purchases')
        self.assertEqual(resolve(url).func.view_class, views.MyPurchasesView)
    
    def test_admin_users_url(self):
        url = reverse('accounts:admin_users')
        self.assertEqual(resolve(url).func.view_class, views.AdminUserListView)
    
    def test_admin_dashboard_url(self):
        url = reverse('accounts:admin_dashboard')
        self.assertEqual(resolve(url).func.view_class, views.AdminDashboardView)
    
    def test_loyalty_info_url(self):
        url = reverse('accounts:loyalty_info')
        self.assertEqual(resolve(url).func.view_class, views.LoyaltyInfoView)