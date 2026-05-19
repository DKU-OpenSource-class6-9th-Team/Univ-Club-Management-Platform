/* 회비 페이지 상단 요약 카드 파트 
-총 회비 잔액
-이번 달 수입
-이번 달 지출
-미납 회원
-납부율   */

import { Users, Wallet } from 'lucide-react'

function FeeSummaryCards({
  summary,
  unpaidMemberCount, //미납 회원 수
  totalMemberCount, //총 회원 수
  paidMemberCount, //납부 회원 수
  paymentRate, //회비 납부율
  formatWon, //금액 format형태 변경 함수
}) {
  return (
    <section className="club-fee-summary-grid">
      <article className="club-fee-summary-card">
        <div className="club-fee-summary-icon balance">
          <Wallet size={22} />
        </div>

        <div>
          <span>총 회비 잔액</span>
          <strong>
            {summary ? formatWon(summary.balance) : '로딩 중...'} {/*조건 부 렌더링*/}
          </strong>
          <p>{summary ? '총 수입 - 총 지출 기준' : '조회 중...'} </p>
        </div>
      </article>

      <article className="club-fee-summary-card">
        <div className="club-fee-summary-icon income">↗</div>

        <div>
          <span>이번 달 수입</span>
          <strong>
            {summary ? formatWon(summary.monthlyIncome) : '로딩 중...'} {/*조건 부 렌더링*/}
          </strong>
          <p>{summary ? '이번 달 등록된 수입 합계' : '조회 중...'}</p>
        </div>
      </article>

      <article className="club-fee-summary-card">
        <div className="club-fee-summary-icon expense">↘</div>

        <div>
          <span>이번 달 지출</span>
          <strong>
            {summary ? formatWon(summary.monthlyExpense) : '로딩 중...'} {/*조건 부 렌더링*/}
          </strong>
          <p>{summary ? '이번 달 등록된 지출 합계' : '로딩 중...'}</p>
        </div>
      </article>

      <article className="club-fee-summary-card">
        <div className="club-fee-summary-icon unpaid">
          <Users size={22} />
        </div>

        <div>
          <span>미납 회원</span>
          <strong> {unpaidMemberCount}명 </strong>
          <p>전체 {totalMemberCount}명 중 미납</p>
        </div>
      </article>

      <article className="club-fee-summary-card">
        <div className="club-fee-summary-icon rate">%</div>

        <div>
          <span>납부율</span>
          <strong>
            {paymentRate !== null ? `${paymentRate}%` : '0%'} {/*조건 부 렌더링*/}
          </strong>
          <p>완료 {paidMemberCount}명 / 전체 {totalMemberCount}명 </p>
        </div>
      </article>
    </section>
  )
}

export default FeeSummaryCards