/*오른쪽 하든 보조 정보 카드 3가지 영역
-이번달 문의, 만족도 퍼센트, 회비 사용 증빙 */

import { FileText, HeartPulse, Megaphone } from 'lucide-react' //아이콘 불러오기

function FeeSideCards({ sideStats }) {
  return (
    <section className="club-fee-side-card-grid">
      <article className="club-fee-side-card">
        <Megaphone size={22} />
        <span>이번달 이의제기</span>
        <strong>
          {sideStats ? `${sideStats.disputeCount}건` : '기능 구현 중'}
        </strong>
        <p>API 연동 예정</p>
      </article>

      <article className="club-fee-side-card">
        <HeartPulse size={22} />
        <span>만족도 투표</span>
        <strong>
          {sideStats ? `${sideStats.satisfactionRate}%` : '기능 구현 중'}
        </strong>
        <p>API 연동 예정</p>
      </article>

      <article className="club-fee-side-card">
        <FileText size={22} />
        <span>회비 사용 증빙</span>
        <strong>
          {sideStats ? `${sideStats.receiptProofRate}%` : '기능 구현 중'}
        </strong>
        <p>API 연동 예정</p>
      </article>
    </section>
  )
}

export default FeeSideCards