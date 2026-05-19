/*수입/지출 내역 테이블, 영수증 첨부 여부,
첨부된 경우 클릭 시 영수증 증빙 자료 볼 수 있도록 담당한 컴포넌트 */

import { useState } from 'react'
import { getTransactionTypeClass } from '../utils/feeFormat.js'

function RecentTransactionTable({
  transactions = [],
  allTransactions = [],
  isAllTransactionModalOpen,
  isAllTransactionModalLoading,
  onOpenAllTransactions,
  onCloseAllTransactions,
  formatWon,
}) {
  const [selectedReceipts, setSelectedReceipts] = useState(null)

  //영수증 첨부 여부에 따라 버튼 또는 미첨부 표시를 반환하는 함수
  const renderReceiptCell = (transaction) => {
    return transaction.receipts?.length > 0 ? (
      <button
        type="button"
        className="receipt-open-button"
        onClick={() => setSelectedReceipts(transaction.receipts)}
      >
        첨부 {transaction.receipts.length}개
      </button>
    ) : (
      <span className="receipt-empty">미첨부</span>
    )
  }

  return (
    <>
      <section className="club-fee-panel">
        <div className="club-fee-table-header">
          <div>
            <h2>최근 수입 / 지출 내역</h2>
            <p>최근 등록된 회비 수입과 지출 내역입니다.</p>
          </div>

          <button
            type="button"
            onClick={onOpenAllTransactions}
            disabled={isAllTransactionModalLoading}
          >
            {isAllTransactionModalLoading ? '로딩 중...' : '더보기'}
          </button>
        </div>

        <table className="club-fee-table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>구분</th>
              <th>내용</th>
              <th>카테고리</th>
              <th>금액</th>
              <th>증빙자료</th>
            </tr>
          </thead>

          <tbody>
            {transactions.length > 0 ? (
              transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{transaction.date}</td>

                  <td>
                    <span
                      className={`transaction-badge ${getTransactionTypeClass(
                        transaction.type,
                      )}`}
                    >
                      {transaction.type}
                    </span>
                  </td>

                  <td>{transaction.content}</td>
                  <td>{transaction.category}</td>

                  <td
                    className={transaction.amount > 0 ? 'positive' : 'negative'}
                  >
                    {transaction.amount > 0 ? '+' : ''}
                    {formatWon(transaction.amount)}
                  </td>

                  <td>{renderReceiptCell(transaction)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">등록된 수입 / 지출 내역이 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/*더보기 버튼 클릭 시 전체 수입/지출 내역을 보여주는 모달*/}
      {isAllTransactionModalOpen && (
        <div
          className="receipt-modal-backdrop"
          onClick={onCloseAllTransactions}
        >
          <div
            className="receipt-modal transaction-more-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="receipt-modal-header">
              <h3>전체 수입 / 지출 내역</h3>

              <button type="button" onClick={onCloseAllTransactions}>
                닫기
              </button>
            </div>

            <div className="transaction-more-table-wrap">
              <table className="club-fee-table transaction-more-table">
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>구분</th>
                    <th>내용</th>
                    <th>카테고리</th>
                    <th>금액</th>
                    <th>관련 대상</th>
                    <th>메모</th>
                    <th>증빙자료</th>
                  </tr>
                </thead>

                <tbody>
                  {allTransactions.length > 0 ? (
                    allTransactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{transaction.date}</td>

                        <td>
                          <span
                            className={`transaction-badge ${getTransactionTypeClass(
                              transaction.type,
                            )}`}
                          >
                            {transaction.type}
                          </span>
                        </td>

                        <td>{transaction.content}</td>
                        <td>{transaction.category}</td>

                        <td
                          className={
                            transaction.amount > 0 ? 'positive' : 'negative'
                          }
                        >
                          {transaction.amount > 0 ? '+' : ''}
                          {formatWon(transaction.amount)}
                        </td>

                        <td>{transaction.target || '-'}</td>

                        <td className="transaction-memo-cell">
                          {transaction.memo || '-'}
                        </td>

                        <td>{renderReceiptCell(transaction)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8">등록된 수입 / 지출 내역이 없습니다.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedReceipts && (
        <div
          className="receipt-modal-backdrop"
          onClick={() => setSelectedReceipts(null)}
        >
          <div
            className="receipt-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="receipt-modal-header">
              <h3>영수증 증빙 자료</h3>

              <button type="button" onClick={() => setSelectedReceipts(null)}>
                닫기
              </button>
            </div>

            <div className="receipt-preview-list">
              {selectedReceipts.map((receipt) => {
                const receiptName = receipt.name || ''
                const receiptUrl = receipt.url || ''
                const isPdf = receiptName.toLowerCase().endsWith('.pdf')

                return (
                  <div key={receipt.id} className="receipt-preview-item">
                    <p>{receiptName}</p>

                    {isPdf ? (
                      <iframe
                        src={receiptUrl}
                        title={receiptName}
                        className="receipt-pdf-preview"
                      />
                    ) : (
                      <img
                        src={receiptUrl}
                        alt={receiptName}
                        className="receipt-image-preview"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default RecentTransactionTable