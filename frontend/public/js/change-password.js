document.addEventListener('DOMContentLoaded', () => {
  const currentPw = document.getElementById('currentPassword');
  const pw = document.getElementById('password');
  const pwConfirm = document.getElementById('passwordConfirm');
  const currentPwError = document.getElementById('currentPasswordError');
  const pwError = document.getElementById('passwordError');
  const pwConfirmError = document.getElementById('passwordConfirmError');
  const btn = document.getElementById('updatePwBtn');
  const toast = document.getElementById('toastMsg');
  const form = document.getElementById('passwordForm');
  const successModal = document.getElementById('successModal');
  const confirmSuccess = document.getElementById('confirmSuccess');

  const pwRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,20}$/;

  function validate() {
    const currentPwVal = currentPw.value.trim();
    const pwVal = pw.value.trim();
    const confirmVal = pwConfirm.value.trim();

    let valid = true;

    // 현재 비밀번호 검증
    if (!currentPwVal) {
      currentPwError.textContent = '* 현재 비밀번호를 입력해주세요';
      currentPwError.style.display = 'block';
      valid = false;
    } else {
      currentPwError.style.display = 'none';
    }

    // 새 비밀번호 검증
    if (!pwVal) {
      pwError.textContent = '* 새 비밀번호를 입력해주세요';
      pwError.style.display = 'block';
      valid = false;
    } else if (!pwRule.test(pwVal)) {
      pwError.textContent = '* 비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.';
      pwError.style.display = 'block';
      valid = false;
    } else if (currentPwVal && pwVal === currentPwVal) {
      pwError.textContent = '* 새 비밀번호는 현재 비밀번호와 다르게 설정해주세요.';
      pwError.style.display = 'block';
      valid = false;
    } else {
      pwError.style.display = 'none';
    }

    // 비밀번호 확인 검증
    if (!confirmVal) {
      pwConfirmError.textContent = '* 비밀번호를 한번 더 입력해주세요';
      pwConfirmError.style.display = 'block';
      valid = false;
    } else if (pwVal !== confirmVal) {
      pwConfirmError.textContent = '* 비밀번호가 다릅니다.';
      pwConfirmError.style.display = 'block';
      valid = false;
    } else {
      pwConfirmError.style.display = 'none';
    }

    btn.disabled = !valid;
    if (valid) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }

  currentPw.addEventListener('input', validate);
  pw.addEventListener('input', validate);
  pwConfirm.addEventListener('input', validate);

  // 성공 모달 확인 버튼
  if (confirmSuccess) {
    confirmSuccess.addEventListener('click', () => {
      if (successModal) {
        successModal.style.display = 'none';
      }
    });
  }

  // 성공 모달 배경 클릭 시 닫기
  if (successModal) {
    successModal.addEventListener('click', (e) => {
      if (e.target === successModal) {
        successModal.style.display = 'none';
      }
    });
  }

  // 폼 제출 처리
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (btn.disabled) {
      return;
    }

    const currentPwVal = currentPw.value.trim();
    const newPwVal = pw.value.trim();

    btn.disabled = true;
    btn.textContent = '변경 중...';

    try {
      // Express 서버의 /auth/change-password 엔드포인트 사용
      const response = await axios.put('/auth/change-password', {
        currentPassword: currentPwVal,
        newPassword: newPwVal
      }, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true
      });

      console.log('비밀번호 변경 성공:', response.data);

      // 폼 초기화
      form.reset();
      currentPwError.style.display = 'none';
      pwError.style.display = 'none';
      pwConfirmError.style.display = 'none';
      btn.disabled = true;
      btn.classList.remove('active');
      btn.textContent = '변경하기';

      // 성공 모달 표시
      if (successModal) {
        successModal.style.display = 'flex';
      }

    } catch (error) {
      console.error('비밀번호 변경 실패:', error);
      
      btn.disabled = false;
      btn.textContent = '변경하기';
      btn.classList.add('active');

      let errorMessage = '비밀번호 변경에 실패했습니다.';
      
      if (error.response) {
        const errorData = error.response.data;
        errorMessage = errorData?.message || errorData?.error || errorMessage;
        
        // 현재 비밀번호 오류
        if (error.response.status === 400 || error.response.status === 401) {
          if (errorMessage.includes('현재') || errorMessage.includes('current')) {
            currentPwError.textContent = '* ' + errorMessage;
            currentPwError.style.display = 'block';
          } else {
            pwError.textContent = '* ' + errorMessage;
            pwError.style.display = 'block';
          }
        } else {
          if (toast) {
            toast.textContent = errorMessage;
            toast.style.display = 'block';
            setTimeout(() => {
              toast.style.display = 'none';
            }, 3000);
          }
        }
      } else if (error.request) {
        errorMessage = '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.';
        if (toast) {
          toast.textContent = errorMessage;
          toast.style.display = 'block';
          setTimeout(() => {
            toast.style.display = 'none';
          }, 3000);
        }
      } else {
        if (toast) {
          toast.textContent = errorMessage;
          toast.style.display = 'block';
          setTimeout(() => {
            toast.style.display = 'none';
          }, 3000);
        }
      }
    }
  });
});
