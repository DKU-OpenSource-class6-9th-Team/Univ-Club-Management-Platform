/*수입/지출 내역 테이블, 영수증 첨부 여부,
첨부된 경우 클릭 시 영수증 증빙 자료 볼 수 있도록 담당한 컴포넌트 */

import { useState } from 'react'
import { getTransactionTypeClass } from '../utils/feeFormat.js'

function RecentTransactionTable({
  transactions, //수입/지출 내역 배열
  formatWon,
  onFeatureInProgress, //구현 안된 부분은 따로 안내메세지 출력 함수
}) {
  const [selectedReceipts, setSelectedReceipts] = useState(null)

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
            onClick={() => onFeatureInProgress('수입 / 지출 내역 더보기')}
          >
            더보기
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
              <th>영수증</th>
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

                  <td>
                    {transaction.receipts?.length > 0 ? (
                      <button
                        type="button"
                        className="receipt-open-button"
                        onClick={() => setSelectedReceipts(transaction.receipts)}
                      >
                        첨부 {transaction.receipts.length}개
                      </button>
                    ) : (
                      <span className="receipt-empty">미첨부</span>
                    )}
                  </td>
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
                const isPdf = receipt.url.toLowerCase().endsWith('.pdf')

                return (
                  <div key={receipt.id} className="receipt-preview-item">
                    <p>{receipt.name}</p>

                    {isPdf ? (
                      <iframe
                        src={receipt.url}
                        title={receipt.name}
                        className="receipt-pdf-preview"
                      />
                    ) : (
                      <img
                        src={receipt.url}
                        alt={receipt.name}
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