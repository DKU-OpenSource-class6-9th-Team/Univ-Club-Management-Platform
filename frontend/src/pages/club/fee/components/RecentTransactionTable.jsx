/*최근 수입/지출 내역 테이블 영역
-날짜, 수입/지출 구분, 카테고리, 금액, 영수증*/

import { getTransactionTypeClass } from '../utils/feeFormat.js'

function RecentTransactionTable({
  transactions, //최근 수입/지출 내역 배열
  formatWon, //원 형식으로 변경 함수
  onFeatureInProgress, //구현x 기능 클릭 시 안내 함수
}) {
  return (
    <section className="club-fee-panel">
      <div className="club-fee-table-header">
        <div>
          <h2>최근 수입 / 지출 내역</h2>
          <p>최근 등록된 회비 수입과 지출 내역입니다.</p>
        </div>
        {/*버튼 클릭 시 구현 안내문 출력*/}
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

        {/*배열에 값이 있다면 테이블 출력, 없다면 구현 중 안내 출력*/}
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

                <td>{transaction.receipt}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6">수입 / 지출 내역 기능 구현 중입니다.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  )
}

export default RecentTransactionTable