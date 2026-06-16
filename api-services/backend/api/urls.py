from django.urls import path, include
from .views import (
    CreateUserView,
    CurrentUserView,
    CookieTokenRefreshView,
    LogoutView,
    EmailTokenObtainPairView,
    VerifyEmailView,
    ResendVerificationEmailView,
    SportListView,
    CourtCenterDraftCreateView,
    CourtCenterCustomerDetailView,
    CourtCenterCustomerListView,
    MyCourtCenterListView,
    ImageUploadView,
    MyCourtCenterDetailsView,
    MyCourtCenterSchedulesView,
    MyCourtCenterPublishView,
    ProfileView,
    SpeculateLineItemListViewForCustomer,
    ConfirmPaymentView,
    InitiateTransactionView,
    TransactionDetailView,
    MyCourtCenterArchiveView,
    MyTransactionListView,
)

urlpatterns = [
    path('register', CreateUserView.as_view(), name='register'),
    path('me', CurrentUserView.as_view(), name='current_user'),
    path('token', EmailTokenObtainPairView.as_view(), name='get_token'),
    path('token/refresh', CookieTokenRefreshView.as_view(), name='refresh_token'),
    path('logout', LogoutView.as_view(), name='logout'),
    path('verify-email', VerifyEmailView.as_view(), name='verify_email'),
    path('api-auth', include('rest_framework.urls')),
    path('resend-verification-email', ResendVerificationEmailView.as_view(), name='resend_verification_email'),
    path('sports', SportListView.as_view(), name='sport_list'),
    path('images/upload', ImageUploadView.as_view(), name='image_upload'),
    # court center
    path('court-centers', CourtCenterCustomerListView.as_view(), name='court_center_customer_list'),
    path('court-centers/<int:pk>', CourtCenterCustomerDetailView.as_view(), name='court_center_customer_detail'),
    path('court-centers/mine', MyCourtCenterListView.as_view(), name='court_center_owner_list'),
    path('court-centers/create-draft', CourtCenterDraftCreateView.as_view(), name='court_center_create_draft'),
    path('court-centers/mine/<int:pk>', MyCourtCenterDetailsView.as_view(), name='court_center_detail'),
    path('court-centers/mine/<int:pk>/schedules', MyCourtCenterSchedulesView.as_view(), name='court_center_schedules'),
    path('court-centers/mine/<int:pk>/publish', MyCourtCenterPublishView.as_view(), name='court_center_publish'),
    path('court-centers/mine/<int:pk>/archive', MyCourtCenterArchiveView.as_view(), name='court_center_archive'),
    #profile
    path('profile', ProfileView.as_view(), name='profile'),

    #booking
    path('line-items/customer', SpeculateLineItemListViewForCustomer.as_view(), name='speculate_line_item_list_for_customer'),
    path('transactions/initiate', InitiateTransactionView.as_view(), name='initiate_transaction'),
    path('transactions/<int:pk>', TransactionDetailView.as_view(), name='transaction_detail'),
    path('transactions/<int:pk>/confirm-payment', ConfirmPaymentView.as_view(), name='confirm_payment'),

    path('transactions/mine', MyTransactionListView.as_view(), name='my_transaction_list'),
]
