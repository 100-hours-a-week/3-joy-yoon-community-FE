const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { setAccessToken } = require('../utils/tokenStore');
const API_BASE_URL = 'http://localhost:8080/api/v1';
// const API_BASE_URL = CONFIG.API_BASE_URL;

// 로그아웃
// const { clearAccessToken } = require('../utils/tokenStore');

router.post('/login', async (req, res) => {
    console.log('[로그인 성공, 토큰 저장]', data.accessToken);
    try {
        console.log("router 창인가 아닌가")
        const { email, password } = req.body;

        // Spring boot 로그인 API 호출
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({email, password}),
            credentials: 'include', // refreshToken 쿠키 전달받기 위해 필요함.
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ message: data.message });
        }

        // accessToken을 인메모리에 저장
        setAccessToken(data.accessToken);
        return res.json({ message: '로그인 성공', user: data.user });
    } catch (error) {
        console.log('로그인 실패: ', error);
        res.status(500).json({ message: '로그인 오류' });
    }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Spring 로그인 API 호출
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ message: data.message });
    }

    // 세션에 사용자 정보와 토큰 저장
    req.session.userId = data.user?.userId ?? data.user?.id;   // 실제 필드명 확인
    req.session.accessToken = data.accessToken;               // Spring이 준 accessToken
    // req.session.save(callback) - Express가 자동 저장하므로 보통 생략 가능

    return res.json({ message: '로그인 성공', user: data.user });
  } catch (error) {
    console.error('로그인 실패: ', error);
    res.status(500).json({ message: '로그인 오류' });
  }
});


router.post('/logout', (req, res) => {
    clearAccessToken(); // 인메모리 토큰 삭제
    res.json({ message: '로그아웃 완료' });
});

module.exports = router;