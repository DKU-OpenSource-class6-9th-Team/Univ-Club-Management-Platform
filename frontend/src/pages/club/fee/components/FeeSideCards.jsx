/*오른쪽 하단 보조 정보 카드 3가지 영역
- 이번달 회비 사용 건수, 회비 사용 만족도 평균, 회비 사용 증빙률 */

import { FileText, HeartPulse, Megaphone, Star } from 'lucide-react' //아이콘 불러오기

function FeeSideCards({ sideStats }) {
  const renderStars = (score) => {
    const numericScore = Math.min(Math.max(Number(score) || 0, 0), 5)

    return (
      <div className="fee-star-row" aria-label={`${numericScore} / 5`}>
        {[0, 1, 2, 3, 4].map((starIndex) => {
          const fillPercent =
            Math.min(Math.max(numericScore - starIndex, 0), 1) * 100

          return (
            <span
              key={starIndex}
              className="fee-star"
              style={{ '--star-fill': `${fillPercent}%` }}
              aria-hidden="true"
            >
              <Star
                className="fee-star-base"
                size={18}
                strokeWidth={0}
                fill="currentColor"
              />
              <span className="fee-star-fill">
                <Star size={18} strokeWidth={0} fill="currentColor" />
              </span>
            </span>
          )
        })}
      </div>
    )
  }

  return (
    <section className="club-fee-side-card-grid">
      <article className="club-fee-side-card">
        <Megaphone size={22} />
        <span>이번달 회비 변경 건수</span>
        <strong>
          {sideStats ? `${sideStats.monthlyUsageCount}회` : '-'}
        </strong>
        <p>이번 달 등록된 지출 내역</p>
      </article>

      <article className="club-fee-side-card fee-satisfaction-card">
        <HeartPulse size={22} />
        <span>회비 사용 만족도 평균</span>
        <strong>
          {sideStats?.feeSatisfactionAverage ?? '-'} <small>/ 5.0</small>
        </strong>
        {renderStars(sideStats?.feeSatisfactionAverage)}
      </article>

      <article className="club-fee-side-card">
        <FileText size={22} />
        <span>회비 수입/지출 증빙률</span>
        <strong>
          {sideStats ? `${sideStats.receiptProofRate}%` : '-'}
        </strong>
        <p>
          {sideStats
            ? `${sideStats.receiptAttachedCount} / ${sideStats.receiptTargetCount}건 첨부`
            : '증빙 자료 기준'}
        </p>
      </article>
    </section>
  )
}

export default FeeSideCards
