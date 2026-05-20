/*회원별 납부 현황 테이블 영역
-검색, 필터(전체, 완료, 미납), 회원 목록, 납부 상태 변경 버튼, 페이지네이션(1,2,3...페이지화) */

import { getPaymentStatusClass } from '../utils/feeFormat.js'

function MemberPaymentTable({
  members, //회원 목록
  memberFilter, //선택된 필터(전체, 완료, 미납)
  setMemberFilter, //필터 변경 함수
  memberSearch, //검색창에 입력한 값
  setMemberSearch, //검색창 값 변경 함수
  currentPage, //현재 페이지 번호
  setCurrentPage, //페이지 번호 변경 함수
  pageSize, //페이지 마다 보여줄 개수
  setPageSize, //페이지 마다 보여줄 개수 변경 함수
  totalPageCount, //전체 페이지 수
  pageStartIndex, //현재 페이지 시작번호
  pageEndIndex, //현재 페이지 마지막 번호
  totalCount, //필터 적용 후 전체 수
  formatWon, //금액 형식 함수
  onChangePaymentStatus, 
}) {
  return (
    <section className="club-fee-panel member-payment-panel">
      <div className="club-fee-table-header member-table-header">
        <div>
          <h2>회원별 납부 현황</h2>
          <p>회원별 회비 납부 상태를 확인합니다.</p>
        </div>

        <input
          type="text"
          value={memberSearch}
          onChange={(event) => setMemberSearch(event.target.value)}
          placeholder="이름 검색"
        />
      </div>

        {/*필터 버튼 3개를 각각 반복문으로 만드는 파트*/}
      <div className="club-fee-filter-tabs">
        {['전체', '완료', '미납'].map((filter) => (
          <button
            key={filter}
            type="button"
            className={memberFilter === filter ? 'active' : ''}
            onClick={() => setMemberFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      <table className="club-fee-table member-payment-table">
        <thead>
          <tr>
            <th>이름</th>
            <th>학과 / 학번</th>
            <th>납부 상태</th>
            <th>납부 금액</th>
            <th>납부일</th>
            <th>비고</th>
          </tr>
        </thead>

        {/*회원 데이터가 있다면 출력, 없다면 안내 출력*/}
        <tbody>
          {members.length > 0 ? (
            members.map((member) => (
              <tr key={member.id}>
                <td>{member.name}</td>

                <td>
                  {member.department} {member.studentId}학번
                </td>

                <td>
                  <button
                    type="button"
                    className={`payment-status ${getPaymentStatusClass(member.status)}`}
                    onClick={() => onChangePaymentStatus(member)} //회원의 납부 상태 실제로 변경
                  >
                    {member.status} ▾
                  </button>
                </td>

                <td>{formatWon(member.amount)}</td>
                <td>{member.paidDate}</td>
                <td>{member.memo}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6">조건에 맞는 동아리원이 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="member-pagination-row">
        <span>
          {totalCount === 0
            ? '0 - 0 of 0'
            : `${pageStartIndex + 1} - ${pageEndIndex} of ${totalCount}`}
        </span>

        <div className="member-pagination-controls">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            ‹
          </button>

          {Array.from({ length: totalPageCount }).map((_, index) => {
            const pageNumber = index + 1

            return (
              <button
                key={pageNumber}
                type="button"
                className={currentPage === pageNumber ? 'active' : ''}
                onClick={() => setCurrentPage(pageNumber)}
              >
                {pageNumber}
              </button>
            )
          })}

          <button
            type="button"
            disabled={currentPage === totalPageCount}
            onClick={() =>
              setCurrentPage((page) => Math.min(totalPageCount, page + 1))
            }
          >
            ›
          </button>
        </div>

        <select
          value={pageSize}
          onChange={(event) => setPageSize(Number(event.target.value))}
        >
          <option value={10}>10개씩</option>
          <option value={20}>20개씩</option>
          <option value={30}>30개씩</option>
        </select>
      </div>
    </section>
  )
}

export default MemberPaymentTable