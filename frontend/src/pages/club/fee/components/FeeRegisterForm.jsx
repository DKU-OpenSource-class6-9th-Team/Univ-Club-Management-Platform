/*회비 수입/지출 내역 등록 폼 담당 컴포넌트
-수입/지출 선택, 날짜, 내용, 카테고리, 금액, 관련 대상, 메모 입력
-증빙 파일 여러개 첨부 가능, 예상 잔액 계산
-FormData 생성, 부모 컴포넌트인 ClubFeePgae에 등록 요청 전달
-등록 성공 시 입력값 초기화*/

import { useState } from 'react'
import ReceiptDropzone from './ReceiptDropzone.jsx' //증빙 파일 첨부 영역 담당하는 컴포넌트

//폼 입력값 초기 상태 지정
const initialForm = {
  date: '',
  content: '',
  category: '',
  amount: '',
  target: '',
  memo: '',
}

//부모 컴포넌트로부터 받는 값들을 정의하는 함수
function FeeRegisterForm({
  transactionType,
  setTransactionType,
  currentBalance = 0,
  onSubmitTransaction, //등록 요청을 부모 컴포넌트에 맡기기 위한 함수
  isSubmitting = false, //등록 요청이 진행중인지 나타내는 값
}) {
  const [form, setForm] = useState(initialForm)
  const [receiptFiles, setReceiptFiles] = useState([]) //첨부된 영수증 파일 목록을 저장하는 상태

  const handleChange = (event) => { //입력 칸이 바뀔때 마다 실행
    const { name, value } = event.target

    //기존 form상태는 유지하면서 바뀐 부분만 업데이트하는 코드
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  //form 초기화 하는 함수
  const handleReset = () => { 
    setForm(initialForm)
    setReceiptFiles([])
  }

  //입력된 금액(문자열) 숫자로 변환하는 코드
  const amountNumber = Number(form.amount || 0)

  const expectedBalance =
    transactionType === '수입'
      ? currentBalance + amountNumber
      : currentBalance - amountNumber


  //등록 버튼을 누르면 실행되는 함수
  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!form.date || !form.content || !form.category || !form.amount) {
      alert('날짜, 내용, 카테고리, 금액은 필수입니다.')
      return
    }

    if (Number(form.amount) <= 0) {
      alert('금액은 0보다 커야 합니다.')
      return
    }

    const formData = new FormData() //서버로 보낼 데이터를 담는 객체 생성(증빙 파일 포함)

    formData.append('transaction_type', transactionType)
    formData.append('date', form.date)
    formData.append('content', form.content)
    formData.append('category', form.category)
    formData.append('amount', form.amount)
    formData.append('target', form.target)
    formData.append('memo', form.memo)

    receiptFiles.forEach((file) => {
      formData.append('receipts', file) //증빙파일(여러개일 경우 반복)
    })

    const isSuccess = await onSubmitTransaction(formData) //실제 등록 처리는 부모 컴포넌트에 맡기도록 하는 코드

    if (isSuccess) { //등록 성공 시 초기화
      handleReset()
    }
  }

  return (
    <section className="club-fee-panel fee-register-panel">
      <div className="club-fee-panel-title">
        <h2>수입 / 지출 내역 등록</h2>
      </div>

      {/*등록 버튼 누를 시 handleShubmit 함수 실행*/}
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

        <div className="fee-register-form-grid">
          <label>
            <span className="required-label">날짜</span>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
            />
          </label>

          <label>
            <span className="required-label">내용</span>
            <input
              type="text"
              name="content"
              value={form.content}
              onChange={handleChange}
              placeholder="내용을 입력하세요"
            />
          </label>

          <label>
            <span className="required-label">카테고리</span>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
            >
              <option value="" disabled>
                카테고리 선택
              </option>
              <option value="회비">회비</option>
              <option value="활동비">활동비</option>
              <option value="운영/관리비">운영/관리비</option>
              <option value="기타">기타</option>
            </select>
          </label>

          <label>
            <span className="required-label">금액</span>
            <div className="amount-input-wrap">
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                placeholder="금액 입력"
                min="1"
              />
              <span className="amount-unit">원</span>
            </div>
          </label>

          <label>
            <span>관련 대상 / 항목</span>
            <input
              type="text"
              name="target"
              value={form.target}
              onChange={handleChange}
              placeholder="관련 대상 또는 항목 입력"
            />
          </label>

          <label>
            <span>예산 / 메모 (선택)</span>
            <input
              type="text"
              name="memo"
              value={form.memo}
              onChange={handleChange}
              placeholder="메모를 입력하세요"
            />
          </label>
        </div>

        <div className="fee-register-bottom-row">
          <ReceiptDropzone
            receiptFiles={receiptFiles}
            setReceiptFiles={setReceiptFiles}
          />

          <div className="fee-balance-card">
            <span className="fee-balance-label">예상 잔액</span>
            <strong>{expectedBalance.toLocaleString()}원</strong>
            <p>현재 잔액 기준 예상 금액입니다.</p>
          </div>
        </div>

        <div className="fee-register-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={handleReset}
            disabled={isSubmitting}
          >
            초기화
          </button>

          <button type="submit" className="primary" disabled={isSubmitting}>
            {isSubmitting ? '등록 중...' : '등록'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default FeeRegisterForm