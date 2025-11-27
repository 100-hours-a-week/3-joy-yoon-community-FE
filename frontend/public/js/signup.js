document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('signupForm');
  const email = document.getElementById('email');
  const passwordEl = document.getElementById('password');
  const passwordConfirm = document.getElementById('passwordConfirm');
  const nickname = document.getElementById('nickname');
  const image = document.getElementById('profileImage');
  const preview = document.getElementById('profilePreview');
  const submitMsg = document.getElementById('submitMsg');

  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const passwordConfirmError = document.getElementById('passwordConfirmError');
  const nicknameError = document.getElementById('nicknameError');
  const helper = document.getElementById('profileHelper');
  const API_BASE_URL = CONFIG.API_BASE_URL;


  let uploaded = false;
  let base64Image = null;

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
        if (helper) helper.style.visibility = 'visible';
      }
    } else {
      image.click();
    }
  });

  image.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('이미지 크기는 5MB 이하로 제한됩니다.');
      image.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      preview.innerHTML = '';
      const img = document.createElement('img');
      img.src = event.target.result;
      preview.appendChild(img);
      uploaded = true;
      base64Image = event.target.result; // 문자열 저장
      if (helper) helper.style.visibility = 'hidden';
    };
    reader.readAsDataURL(file);
  });

  // ==== 이메일 유효성 검사 ====
  email.addEventListener('blur', async () => {
    const value = email.value.trim();
    if (!value) {
      emailError.textContent = '* 이메일을 입력해주세요.';
      emailError.style.display = 'block';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      emailError.textContent = '* 올바른 이메일 주소 형식을 입력해주세요.';
      emailError.style.display = 'block';
      return;
    }

    try {
      const resp = await fetch(`${API_BASE_URL}/auth/check-email?email=${encodeURIComponent(value)}`);
      const data = await resp.json();
      if (resp.ok && data.available === false) {
        emailError.textContent = '* 중복된 이메일입니다.';
        emailError.style.display = 'block';
      } else {
        emailError.style.display = 'none';
      }
    } catch (err) {
      console.error('이메일 확인 오류:', err);
    }
  });

  // ==== 비밀번호 유효성 검사 ====
  const pwRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,20}$/;

  passwordEl.addEventListener('blur', () => {
    const pw = passwordEl.value.trim();
    if (!pw) {
      passwordError.textContent = '* 비밀번호를 입력해주세요.';
      passwordError.style.display = 'block';
    } else if (!pwRule.test(pw)) {
      passwordError.textContent = '* 비밀번호는 8~20자, 대/소문자, 숫자, 특수문자를 포함해야 합니다.';
      passwordError.style.display = 'block';
    } else {
      passwordError.style.display = 'none';
    }
  });

  passwordConfirm.addEventListener('blur', () => {
    if (!passwordConfirm.value.trim()) {
      passwordConfirmError.textContent = '* 비밀번호를 한번 더 입력해주세요.';
      passwordConfirmError.style.display = 'block';
    } else if (passwordEl.value.trim() !== passwordConfirm.value.trim()) {
      passwordConfirmError.textContent = '* 비밀번호가 다릅니다.';
      passwordConfirmError.style.display = 'block';
    } else {
      passwordConfirmError.style.display = 'none';
    }
  });

  // ==== 닉네임 검사 ====
  nickname.addEventListener('blur', async () => {
    const value = nickname.value.trim();

    if (!value) {
      nicknameError.textContent = '* 닉네임을 입력해주세요.';
      nicknameError.style.display = 'block';
      return;
    }
    if (/\s/.test(value)) {
      nicknameError.textContent = '* 띄어쓰기를 없애주세요.';
      nicknameError.style.display = 'block';
      return;
    }
    if (value.length > 10) {
      nicknameError.textContent = '* 닉네임은 최대 10자까지 작성 가능합니다.';
      nicknameError.style.display = 'block';
      return;
    }

    try {
      const resp = await fetch(`${API_BASE_URL}/auth/check-nickname?nickname=${encodeURIComponent(value)}`);
      const data = await resp.json();
      if (resp.ok && data.available === false) {
        nicknameError.textContent = '* 중복된 닉네임입니다.';
        nicknameError.style.display = 'block';
      } else {
        nicknameError.style.display = 'none';
      }
    } catch (err) {
      console.error('닉네임 확인 오류:', err);
    }
  });

  // ==== 폼 제출 ====
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitMsg.textContent = '회원가입 요청 중입니다...';
    submitMsg.style.color = 'black';

    try {
      const payload = {
        email: email.value.trim(),
        password: passwordEl.value,
        nickname: nickname.value.trim(),
        image: base64Image || null
      };

      const resp = await fetch('${API_BASE_URL}/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (resp.ok) {
        const data = await resp.json();
        submitMsg.style.color = 'green';
        submitMsg.textContent = '회원가입이 완료되었습니다!';
        alert('회원 가입 성공! 게시판으로 이동합니다.');
        console.log('가입 성공:', data);
        // location.href = '/login';
      } else {
        const text = await resp.text();
        submitMsg.style.color = '#dc2626';
        alert('회원 가입 실패! 처음 페이지로 이동합니다.');
        submitMsg.textContent = '회원가입 실패: ' + (text || resp.statusText);
        console.error('실패 응답:', text);
      }
    } catch (err) {
      console.error('네트워크 오류:', err);
      submitMsg.style.color = '#dc2626';
      submitMsg.textContent = '네트워크 오류가 발생했습니다.';
    }
  });
});
