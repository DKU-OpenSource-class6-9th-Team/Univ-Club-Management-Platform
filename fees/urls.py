from django.urls import path
from . import views #views.py에서 만든 fee_summary, fee_transactions 함수를 URL과 연결하기 위해

urlpatterns = [
    path( 'clubs/<int:club_id>/fees/summary/',
         views.fee_summary,
         name='fee-summary',
         ),
        
    path( 'clubs/<int:club_id>/fees/transactions/',
         views.fee_transactions,
         name='fee-transactions',
         ),

     path( 'fees/receipts/<int:receipt_id>/file/',
          views.fee_receipt_file,
          name = 'fee-receipt-file',
          ),
]