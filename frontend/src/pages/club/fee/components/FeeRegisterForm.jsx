/*회비 수입/지출 내역 UI담당
-수입/지출 선택,
-날짜, 내용, 카테고리, 금액 입력,
-영수증 첨부, 예상 잔액, 초기화, 등록 영역*/

import { FileText } from 'lucide-react'

function FeeRegisterForm({ //React 컴포넌트 생성
  transactionType, //현재 선택값 저장(수입/지출)
  setTransactionType, //선택 값 변경 함수
  onFeatureInProgress, //구현x인 기능 클릭시 안내문 출력 함수
}) {
  const handleSubmit = (event) => { //등록 버튼 클릭시 실행
    event.preventDefault()
    onFeatureInProgress('수입 / 지출 내역 등록')
  }

  return (
    <section className="club-fee-panel fee-register-panel">
      <div className="club-fee-panel-title">
        <h2>수입 / 지출 내역 등록</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="fee-register-tabs">
          <button
            type="button"
            className={transactionType === '수입' ? 'active' : ''}
            onClick={() => setTransactionType('수입')}
          >
            수입
          </button>

          <button
            type="button"
            className={transactionType === '지출' ? 'active' : ''}
            onClick={() => setTransactionType('지출')}
          >
            지출
          </button>
        </div>

            {/*입력 필드*/}
        <div className="fee-register-form-grid">
          <label>
            <span className="required-label">날짜</span>
            <input type="date" />
          </label>

          <label>
            <span className="required-label">내용</span>
            <input type="text" placeholder="내용을 입력하세요" />
          </label>

          <label>
            <span className="required-label">카테고리</span>
            <select defaultValue="">
              <option value="" disabled>
                카테고리 선택
              </option>
              <option>회비</option>
              <option>활동비</option>
              <option>운영/관리비</option>
              <option>기타</option>
            </select>
          </label>

          <label>
            <span className="required-label">금액</span>
            <div className="amount-input-wrap">
              <input type="number" placeholder="금액 입력" />
              <span className="amount-unit">원</span>
            </div>
          </label>

          <label>
            <span>관련 대상 / 항목</span>
            <input type="text" placeholder="관련 대상 또는 항목 입력" />
          </label>

          <label>
            <span>예산 / 메모 (선택)</span>
            <input type="text" placeholder="메모를 입력하세요" />
          </label>
        </div>

        <div className="fee-register-bottom-row">
          <div className="fee-receipt-upload-section">
            <p className="upload-section-title">영수증 첨부 (선택)</p>

            {/*영수증첨부 박스 클릭시 안내*/}
            <button
              type="button"
              className="fee-register-upload-box" 
              onClick={() => onFeatureInProgress('영수증 첨부')}
            >
              <FileText size={18} />
              <strong>파일을 드래그하거나 클릭하여 첨부하세요</strong>
              <span>JPG, PNG, PDF 최대 10MB</span>
            </button>
          </div>

          <div className="fee-balance-card">
            <span className="fee-balance-label">예상 잔액</span>
            <strong>기능 구현 중</strong>
            <p>API 연동 후 계산 예정</p>
          </div>
        </div>

        <div className="fee-register-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={() => onFeatureInProgress('입력값 초기화')}
          >
            초기화
          </button>

          <button type="submit" className="primary">
            등록
          </button>
        </div>
      </form>
    </section>
  )
}

export default FeeRegisterForm