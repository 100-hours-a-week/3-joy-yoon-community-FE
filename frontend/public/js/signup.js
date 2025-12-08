document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('signupForm');
  const email = document.getElementById('email');
  const passwordEl = document.getElementById('password');
  const passwordConfirm = document.getElementById('passwordConfirm');
  const nickname = document.getElementById('nickname');
  const image = document.getElementById('profileImage');
  const preview = document.getElementById('profilePreview');
  const submitMsg = document.getElementById('submitMsg');
  const submitBtn = form.querySelector('button[type="submit"]');

  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const passwordConfirmError = document.getElementById('passwordConfirmError');
  const nicknameError = document.getElementById('nicknameError');
  const helper = document.getElementById('profileHelper');
  const API_BASE_URL = CONFIG.API_BASE_URL;

  let uploaded = false;
  let base64Image = null;

  // 유효성 상태 관리
  const validationState = {
    email: false,
    password: false,
    passwordConfirm: false,
    nickname: false
  };

  // 디바운스 함수 (API 호출 최적화)
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Helper 텍스트 표시 함수
  function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    element.style.color = '#e07a5f';
    element.classList.add('show');
  }

  function showSuccess(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    element.style.color = '#81b29a';
    element.classList.add('show');
  }

  function showInfo(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    element.style.color = '#8b8da3';
    element.classList.add('show');
  }

  function hideHelper(element) {
    element.textContent = '';
    element.style.display = 'none';
    element.classList.remove('show');
  }

  // 입력 필드 스타일 업데이트
  function setInputValid(input) {
    input.style.borderColor = '#81b29a';
    input.style.boxShadow = '0 0 0 3px rgba(129, 178, 154, 0.2)';
  }

  function setInputInvalid(input) {
    input.style.borderColor = '#e07a5f';
    input.style.boxShadow = '0 0 0 3px rgba(224, 122, 95, 0.2)';
  }

  function setInputNeutral(input) {
    input.style.borderColor = '';
    input.style.boxShadow = '';
  }

  // 제출 버튼 상태 업데이트
  function updateSubmitButton() {
    const allValid = Object.values(validationState).every(v => v === true);
    submitBtn.disabled = !allValid;
    if (allValid) {
      submitBtn.classList.add('active');
    } else {
      submitBtn.classList.remove('active');
    }
  }

  // ==== 프로필 이미지 업로드 ====
  preview.addEventListener('click', () => {
    if (uploaded) {
      const confirmDelete = confirm('등록한 프로필 사진을 삭제하시겠습니까?');
      if (confirmDelete) {
        preview.innerHTML = '<span class="plus-icon">+</span>';
        preview.style.backgroundImage = '';
        uploaded = false;
        base64Image = null;
        image.value = '';
        if (helper) {
          helper.style.visibility = 'visible';
          helper.textContent = '프로필 사진을 추가해주세요.';
          helper.style.color = '#8b8da3';
        }
      }
    } else {
      image.click();
    }
  });

  // 이미지 압축 함수
  function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 비율 유지하면서 크기 조정
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // 압축된 이미지를 base64로 변환
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = event.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  image.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('이미지 크기는 5MB 이하로 제한됩니다.');
      image.value = '';
      return;
    }

    try {
      // 이미지 압축 (더 작은 크기로 압축)
      let compressedImage = await compressImage(file, 400, 400, 0.7);
      
      // 압축 후에도 크기가 크면 더 압축
      let compressedSize = (compressedImage.length * 3) / 4;
      if (compressedSize > 200 * 1024) { // 200KB 이상이면
        console.log('이미지가 여전히 큽니다. 추가 압축 중...');
        compressedImage = await compressImage(file, 300, 300, 0.6);
        compressedSize = (compressedImage.length * 3) / 4;
      }
      
      preview.innerHTML = '';
      const img = document.createElement('img');
      img.src = compressedImage;
      preview.appendChild(img);
      uploaded = true;
      base64Image = compressedImage;
      
      // 압축 후 크기 확인
      console.log('원본 크기:', (file.size / 1024).toFixed(2), 'KB');
      console.log('압축 후 크기:', (compressedSize / 1024).toFixed(2), 'KB');
      console.log('base64 길이:', compressedImage.length);
      
      if (compressedSize > 300 * 1024) {
        console.warn('압축 후에도 이미지가 큽니다. 서버 전송 시 문제가 발생할 수 있습니다.');
      }
      
      if (helper) {
        helper.textContent = '프로필 사진이 등록되었습니다.';
        helper.style.color = '#81b29a';
      }
    } catch (error) {
      console.error('이미지 압축 실패:', error);
      alert('이미지 처리 중 오류가 발생했습니다.');
      image.value = '';
    }
  });

  // ==== 이메일 유효성 검사 (실시간) ====
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // 이메일 중복 체크 (디바운스 적용)
  const checkEmailDuplicate = debounce(async (value) => {
    try {
      // Express 서버의 /auth/check-email 엔드포인트 사용
      const resp = await axios.get(`/auth/check-email?email=${encodeURIComponent(value)}`, {
        withCredentials: true // 쿠키 전송
      });
      const data = resp.data;
      if (data.available === false) {
        showError(emailError, '이미 사용 중인 이메일입니다.');
        setInputInvalid(email);
        validationState.email = false;
      } else {
        showSuccess(emailError, '사용 가능한 이메일입니다.');
        setInputValid(email);
        validationState.email = true;
      }
    } catch (err) {
      console.error('이메일 중복 체크 오류:', err);
      // API 연결 실패 시에도 형식만 맞으면 통과 (서버 연결 안될 때)
      if (err.response && err.response.status === 400) {
        showError(emailError, '올바른 이메일 형식이 아닙니다.');
        setInputInvalid(email);
        validationState.email = false;
      } else {
        console.log('이메일 중복 체크 스킵 (서버 미연결)');
        showSuccess(emailError, '올바른 이메일 형식입니다.');
        setInputValid(email);
        validationState.email = true;
      }
    }
    updateSubmitButton();
  }, 500);

  email.addEventListener('input', () => {
    const value = email.value.trim();
    
    if (!value) {
      showInfo(emailError, '이메일을 입력해주세요.');
      setInputNeutral(email);
      validationState.email = false;
      updateSubmitButton();
      return;
    }

    if (!emailRegex.test(value)) {
      showError(emailError, '✗ 올바른 이메일 형식이 아닙니다. (예: example@email.com)');
      setInputInvalid(email);
      validationState.email = false;
      updateSubmitButton();
      return;
    }

    // 형식이 맞으면 바로 유효 처리 후 중복 체크 시도
    showInfo(emailError, '이메일 확인 중...');
    checkEmailDuplicate(value);
  });

  // ==== 비밀번호 유효성 검사 (실시간) ====
  const pwRules = {
    length: { regex: /.{8,20}/, message: '8~20자' },
    lowercase: { regex: /[a-z]/, message: '소문자' },
    uppercase: { regex: /[A-Z]/, message: '대문자' },
    number: { regex: /\d/, message: '숫자' },
    special: { regex: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/, message: '특수문자' }
  };

  passwordEl.addEventListener('input', () => {
    const pw = passwordEl.value;
    
    if (!pw) {
      showInfo(passwordError, '8~20자, 대/소문자, 숫자, 특수문자 포함');
      setInputNeutral(passwordEl);
      validationState.password = false;
      updateSubmitButton();
      // 비밀번호 확인도 다시 검사
      if (passwordConfirm.value) {
        validatePasswordConfirm();
      }
      return;
    }

    // 각 규칙 체크
    const results = [];
    let allPassed = true;

    for (const [key, rule] of Object.entries(pwRules)) {
      const passed = rule.regex.test(pw);
      if (!passed) {
        allPassed = false;
        results.push(`<span style="color: #e07a5f;">${rule.message}</span>`);
      } else {
        results.push(`<span style="color: #81b29a;">${rule.message}</span>`);
      }
    }

    passwordError.innerHTML = results.join(' · ');
    passwordError.style.display = 'block';
    passwordError.classList.add('show');

    if (allPassed) {
      setInputValid(passwordEl);
      validationState.password = true;
    } else {
      setInputInvalid(passwordEl);
      validationState.password = false;
    }

    updateSubmitButton();

    // 비밀번호 확인 필드에 값이 있으면 재검사
    if (passwordConfirm.value) {
      validatePasswordConfirm();
    }
  });

  // ==== 비밀번호 확인 검사 (실시간) ====
  function validatePasswordConfirm() {
    const pw = passwordEl.value;
    const pwConfirm = passwordConfirm.value;

    if (!pwConfirm) {
      showInfo(passwordConfirmError, '비밀번호를 다시 입력해주세요.');
      setInputNeutral(passwordConfirm);
      validationState.passwordConfirm = false;
      updateSubmitButton();
      return;
    }

    if (pw !== pwConfirm) {
      showError(passwordConfirmError, '비밀번호가 일치하지 않습니다.');
      setInputInvalid(passwordConfirm);
      validationState.passwordConfirm = false;
    } else {
      showSuccess(passwordConfirmError, '비밀번호가 일치합니다.');
      setInputValid(passwordConfirm);
      validationState.passwordConfirm = true;
    }

    updateSubmitButton();
  }

  passwordConfirm.addEventListener('input', validatePasswordConfirm);

  // ==== 닉네임 검사 (실시간) ====
  const checkNicknameDuplicate = debounce(async (value) => {
    try {
      // Express 서버의 /auth/check-nickname 엔드포인트 사용
      const resp = await axios.get(`/auth/check-nickname?nickname=${encodeURIComponent(value)}`, {
        withCredentials: true // 쿠키 전송
      });
      const data = resp.data;
      if (data.available === false) {
        showError(nicknameError, '이미 사용 중인 닉네임입니다.');
        setInputInvalid(nickname);
        validationState.nickname = false;
      } else {
        showSuccess(nicknameError, '사용 가능한 닉네임입니다.');
        setInputValid(nickname);
        validationState.nickname = true;
      }
    } catch (err) {
      console.error('닉네임 중복 체크 오류:', err);
      // API 연결 실패 시에도 형식만 맞으면 통과 (서버 연결 안될 때)
      if (err.response && err.response.status === 400) {
        showError(nicknameError, '올바른 닉네임 형식이 아닙니다.');
        setInputInvalid(nickname);
        validationState.nickname = false;
      } else {
        console.log('닉네임 중복 체크 스킵 (서버 미연결)');
        showSuccess(nicknameError, '사용 가능한 닉네임입니다.');
        setInputValid(nickname);
        validationState.nickname = true;
      }
    }
    updateSubmitButton();
  }, 500);

  nickname.addEventListener('input', () => {
    const value = nickname.value.trim();

    if (!value) {
      showInfo(nicknameError, '2~10자, 공백 없이 입력해주세요.');
      setInputNeutral(nickname);
      validationState.nickname = false;
      updateSubmitButton();
      return;
    }

    if (/\s/.test(nickname.value)) {
      showError(nicknameError, '닉네임에 공백은 사용할 수 없습니다.');
      setInputInvalid(nickname);
      validationState.nickname = false;
      updateSubmitButton();
      return;
    }

    if (value.length < 2) {
      showError(nicknameError, '닉네임은 최소 2자 이상이어야 합니다.');
      setInputInvalid(nickname);
      validationState.nickname = false;
      updateSubmitButton();
      return;
    }

    if (value.length > 10) {
      showError(nicknameError, '닉네임은 최대 10자까지 가능합니다.');
      setInputInvalid(nickname);
      validationState.nickname = false;
      updateSubmitButton();
      return;
    }

    // 형식이 맞으면 바로 유효 처리 후 중복 체크 시도
    showInfo(nicknameError, '⏳ 닉네임 확인 중...');
    checkNicknameDuplicate(value);
  });

  // ==== 폼 제출 ====
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 모든 필드가 유효한지 최종 확인
    if (!Object.values(validationState).every(v => v === true)) {
      alert('모든 필드를 올바르게 입력해주세요.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '가입 중...';

    try {
      const payload = {
        email: email.value.trim(),
        password: passwordEl.value,
        nickname: nickname.value.trim(),
        profileImage: base64Image || null
      };

      console.log('회원가입 요청:', { email: payload.email, nickname: payload.nickname });

      // Express 서버의 /auth/signup 엔드포인트 사용
      const resp = await axios.post('/auth/signup', payload, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true
      });

      const data = resp.data;
      console.log('회원가입 성공:', data);
      
      // 첫 번째 토스트: 회원가입 성공 메시지
      if (typeof showToast === 'function') {
        showToast('🧶 회원가입이 완료되었습니다!', 2000);
        
        // 2.5초 후 두 번째 토스트: 로그인 페이지로 이동 메시지
        setTimeout(() => {
          showToast('로그인 페이지로 이동합니다...', 2000);
          
          // 4.5초 후 로그인 페이지로 이동
          setTimeout(() => {
            location.href = '/login';
          }, 2000);
        }, 2500);
      } else {
        // showToast가 없는 경우 바로 이동
        setTimeout(() => {
          location.href = '/login';
        }, 1000);
      }
    } catch (err) {
      console.error('회원가입 실패:', err);
      submitBtn.disabled = false;
      submitBtn.textContent = '회원가입';
      
      let errorMessage = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.';
      if (err.response) {
        errorMessage = err.response.data?.message || err.response.data?.error || errorMessage;
        console.error('에러 응답:', err.response.status, err.response.data);
      } else if (err.request) {
        errorMessage = '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.';
      }
      
      alert(errorMessage);
    }
  });
});
