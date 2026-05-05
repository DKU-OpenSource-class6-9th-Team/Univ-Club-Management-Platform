import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { getProfile, updateProfile } from '../api/accounts.js';

function ProfileEditPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    school_name: '',
    department: '',
    student_id: '',
    nickname: '',
    phone_number: '',
  });

  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loginUser = JSON.parse(localStorage.getItem('loginUser'));

    if (!loginUser) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    async function fetchProfile() {
      try {
        const data = await getProfile(loginUser.id);

        setFormData({
          school_name: data.school_name,
          department: data.department,
          student_id: data.student_id,
          nickname: data.nickname,
          phone_number: data.phone_number || '',
        });
      } catch (error) {
        console.error(error);
        setErrorMessage('프로필 정보를 불러오지 못했습니다.');
      }
    }

    fetchProfile();
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const loginUser = JSON.parse(localStorage.getItem('loginUser'));

    if (!loginUser) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await updateProfile(loginUser.id, formData);
      alert('프로필이 수정되었습니다.');
      navigate('/mypage');
    } catch (error) {
      console.error(error);
      setErrorMessage('프로필 수정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="프로필 수정" subtitle="내 정보를 수정하세요.">
      <form className="auth-commonform signup-form" onSubmit={handleSubmit}>
        {errorMessage && (
          <p className="form-error-text">{errorMessage}</p>
        )}

        <label className="form-label">
          <span>학교</span>
          <div className="input-box">
            <input
              type="text"
              name="school_name"
              value={formData.school_name}
              onChange={handleChange}
              placeholder="학교를 입력하세요"
              required
            />
          </div>
        </label>

        <label className="form-label">
          <span>학과</span>
          <div className="input-box">
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="학과를 입력하세요"
              required
            />
          </div>
        </label>

        <label className="form-label">
          <span>학번</span>
          <div className="input-box">
            <input
              type="text"
              name="student_id"
              value={formData.student_id}
              onChange={handleChange}
              placeholder="학번을 입력하세요"
              required
            />
          </div>
        </label>

        <label className="form-label">
          <span>닉네임</span>
          <div className="input-box">
            <input
              type="text"
              name="nickname"
              value={formData.nickname}
              onChange={handleChange}
              placeholder="닉네임을 입력하세요"
              required
            />
          </div>
        </label>

        <label className="form-label">
          <span>전화번호</span>
          <div className="input-box">
            <input
              type="text"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="전화번호를 입력하세요"
            />
          </div>
        </label>

        <button
          type="submit"
          className="primary-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? '수정 중...' : '수정하기'}
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={() => navigate('/mypage')}
        >
          취소
        </button>
      </form>
    </AuthLayout>
  );
}

export default ProfileEditPage;