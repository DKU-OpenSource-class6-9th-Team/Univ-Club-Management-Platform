import { useEffect, useState } from 'react';

function DeleteAccount({
  isOpen, // 확인창 표시 여부
  errorMessage, // 비밀번호가 올바르지 않을 때 표시
  cancel, // 취소
  confirm, // 최종 탈퇴
}) {
  const [password, setPassword] = useState('');

  // 다시 창 열 때 값들 초기화
  useEffect(() => {
    if (isOpen) {
      setPassword('');
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event) => {
    event.preventDefault(); // 새로고침 방지

    confirm({
      password,
    });
  };

  return (
    <div className="delete-account-overlay">
      <div className="delete-account-confirm-box">
        <button
          type="button"
          className="delete-account-close-button"
          onClick={cancel}
          aria-label="회원탈퇴 창 닫기"
        >
          x
        </button>

        <h3>회원탈퇴</h3>

        <p className="delete-account-notice">
          탈퇴 시 계정 정보가 영구 삭제됩니다.
        </p>

        <form className="delete-account-form" onSubmit={handleSubmit}>
          <label className="form-label">
            <span>비밀번호 재입력</span>

            <div className="input-box">
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호를 입력하세요"
                required
              />
            </div>
          </label>

          {errorMessage && (
            <p className="form-error-text">{errorMessage}</p>
          )}

          <div className="delete-account-action-buttons">
            <button
              type="button"
              className="delete-account-cancel-button"
              onClick={cancel}
            >
              취소
            </button>

            <button
              type="submit"
              className="delete-account-confirm-button"
            >
                탈퇴하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DeleteAccount;