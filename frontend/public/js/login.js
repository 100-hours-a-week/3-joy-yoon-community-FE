document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');
  const emailInput = document.getElementById('email');
  const pwInput = document.getElementById('password');
  const btn = document.querySelector('.btn');
  const loginError = document.getElementById('loginError'); // helper text 영역
  // Express 서버의 /auth/login 엔드포인트 사용 (세션 설정을 위해)
  const LOGIN_API_URL = '/auth/login';
  
  // 필수 요소가 없으면 에러 로그 출력 후 종료
  if (!form || !emailInput || !pwInput) {
    console.error('로그인 폼 요소를 찾을 수 없습니다.');
    return;
  }
  
  // 페이지 진입 시 helper text 초기화
  if (loginError) {
    loginError.textContent = '';
    loginError.style.display = 'none';
  }

  // 로그인 요청 처리
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = pwInput.value;

    // 기존 에러 메시지 초기화
    if (loginError) {
      loginError.textContent = '';
      loginError.style.display = 'none';
    }

    try {
      const resp = await axios.post(LOGIN_API_URL, {
        email,
        password
      }, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true // 쿠키(세션) 전송을 위해 필요
      });

      const data = resp.data;

      // 로그인 성공 시 helper text 숨기기
      if (loginError) {
        loginError.textContent = '';
        loginError.style.display = 'none';
      }

      // alert 제거 - 바로 게시판으로 이동
      window.location.href = '/post-list';
    } catch (err) {
      const errorMessage = err.response?.data?.message || '아이디 또는 비밀번호를 확인해주세요';
      
      if (loginError) {
        loginError.textContent = `* ${errorMessage}`;
        loginError.style.display = 'block';
        loginError.style.color = '#e53935';
      }
      console.error('로그인 실패:', err);
    }
  });
});
