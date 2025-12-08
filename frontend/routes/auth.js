const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getAccessToken } = require('../utils/tokenStore');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080/api';

// 로그인
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    console.log('로그인 시도:', { email });
    
    try {
        // Spring Boot 로그인 API 호출
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email,
            password
        }, {
            headers: { 'Content-Type': 'application/json' }
            // withCredentials는 브라우저에서만 의미가 있으므로 서버 간 통신에서는 제거
        });

        const data = response.data;
        console.log('백엔드 응답 데이터:', JSON.stringify(data, null, 2));

        // 백엔드 응답 구조에 따라 유연하게 처리
        // 가능한 구조: { user: {...}, accessToken: "..." } 또는 { userId, email, ... }
        const userData = data.user || data;
        const userId = userData.userId ?? userData.id ?? data.userId;
        const userEmail = userData.email ?? data.email;
        const userNickname = userData.nickname ?? data.nickname;
        // 백엔드에서 image 필드로 오는 것을 profileImage로 변환
        // 백엔드에서 image 필드로 오는 것을 profileImage로 변환
        const userProfileImage = userData.image ?? userData.profileImage ?? data.image ?? data.profileImage;
        const accessToken = data.accessToken ?? data.token;

        if (!userId) {
            console.error('사용자 ID를 찾을 수 없습니다. 응답 데이터:', data);
            return res.status(500).json({ message: '로그인 응답 형식 오류' });
        }

        // 세션에 사용자 정보 저장 (토큰은 세션에만 저장하여 XSS 방지)
        req.session.userId = userId;
        req.session.email = userEmail;
        req.session.nickname = userNickname;
        // 프로필 이미지가 null, 빈 문자열, 'null'이면 세션에도 null로 저장
        if (userProfileImage && userProfileImage !== null && userProfileImage !== '' && userProfileImage !== 'null') {
            req.session.profileImage = userProfileImage;
            req.session.image = userProfileImage;
        } else {
            req.session.profileImage = null;
            req.session.image = null;
        }
        if (accessToken) {
            req.session.accessToken = accessToken;
        }

        console.log('세션에 저장된 정보:', {
            userId: req.session.userId,
            email: req.session.email,
            nickname: req.session.nickname
        });

        // 세션 저장 완료 후 응답
        req.session.save((err) => {
            if (err) {
                console.error('세션 저장 실패:', err);
                return res.status(500).json({ message: '세션 저장 오류' });
            }
            console.log('로그인 성공 - 세션 저장 완료');
            return res.json({ 
                message: '로그인 성공', 
                user: {
                    userId: req.session.userId,
                    email: req.session.email,
                    nickname: req.session.nickname,
                    profileImage: req.session.profileImage
                }
            });
        });
    } catch (error) {
        console.error('로그인 실패:', error.message);
        if (error.response) {
            // 서버가 응답했지만 에러 상태 코드
            console.error('에러 응답:', {
                status: error.response.status,
                data: error.response.data
            });
            return res.status(error.response.status).json({ 
                message: error.response.data?.message || error.response.data?.error || '로그인 실패' 
            });
        }
        if (error.request) {
            console.error('요청 전송 실패 - 백엔드 서버에 연결할 수 없습니다');
            return res.status(503).json({ message: '백엔드 서버에 연결할 수 없습니다.' });
        }
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 로그아웃
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('세션 삭제 실패:', err);
            return res.status(500).json({ message: '로그아웃 실패' });
        }
        res.clearCookie('sessionId'); // 쿠키도 삭제
        res.json({ message: '로그아웃 완료' });
    });
});

// 회원가입
router.post('/signup', async (req, res) => {
    const { email, password, nickname, profileImage } = req.body;
    
    console.log('=== 회원가입 시도 ===');
    console.log('이메일:', email);
    console.log('닉네임:', nickname);
    console.log('비밀번호 길이:', password?.length || 0);
    console.log('프로필 이미지 존재:', !!profileImage);
    console.log('프로필 이미지 크기 (base64 길이):', profileImage ? profileImage.length : 0);
    
    // 프로필 이미지가 너무 크면 경고
    if (profileImage && profileImage.length > 500000) { // 약 375KB (base64는 원본보다 약 33% 큼)
        console.warn('프로필 이미지가 너무 큽니다. 압축이 필요할 수 있습니다.');
    }
    
    try {
        const requestPayload = {
            email,
            password,
            nickname
        };
        
        // 프로필 이미지가 있으면 image 필드로 추가 (백엔드 users.image 필드에 저장)
        if (profileImage !== null && profileImage !== undefined) {
            requestPayload.image = profileImage; // 백엔드의 users.image 필드에 저장
        }
        
        console.log('백엔드로 전송할 데이터:', {
            email: requestPayload.email,
            nickname: requestPayload.nickname,
            hasPassword: !!requestPayload.password,
            hasImage: !!requestPayload.image
        });
        
        const response = await axios.post(`${API_BASE_URL}/auth/signup`, requestPayload, {
            headers: { 'Content-Type': 'application/json' }
        });

        const data = response.data;
        console.log('회원가입 성공:', data);

        return res.json({ message: '회원가입 성공', user: data.user || data });
    } catch (error) {
        console.error('=== 회원가입 실패 ===');
        console.error('에러 타입:', error.constructor.name);
        console.error('에러 메시지:', error.message);
        
        if (error.response) {
            console.error('에러 응답 상태:', error.response.status);
            console.error('에러 응답 데이터:', JSON.stringify(error.response.data, null, 2));
            console.error('에러 응답 헤더:', error.response.headers);
            
            // 백엔드가 빈 응답을 보낸 경우 처리
            const errorData = error.response.data;
            if (!errorData || (typeof errorData === 'string' && errorData.trim() === '')) {
                return res.status(error.response.status).json({ 
                    message: '백엔드 서버에서 오류가 발생했습니다. 서버 로그를 확인해주세요.',
                    status: error.response.status
                });
            }
            
            return res.status(error.response.status).json({ 
                message: errorData?.message || errorData?.error || '회원가입 실패' 
            });
        }
        if (error.request) {
            console.error('요청 전송 실패 - 백엔드 서버에 연결할 수 없습니다');
            console.error('요청 정보:', error.request);
            return res.status(503).json({ message: '백엔드 서버에 연결할 수 없습니다.' });
        }
        
        console.error('요청 설정 오류:', error.message);
        console.error('에러 스택:', error.stack);
        res.status(500).json({ message: '회원가입 중 오류가 발생했습니다: ' + error.message });
    }
});

// 이메일 중복 체크
router.get('/check-email', async (req, res) => {
    try {
        const { email } = req.query;
        
        if (!email) {
            return res.status(400).json({ message: '이메일을 입력해주세요.' });
        }
        
        console.log('=== 이메일 중복 체크 요청 ===');
        console.log('이메일:', email);
        
        // 클라이언트의 Cookie를 백엔드로 전달 (회원가입 시에는 없을 수 있음)
        const clientCookies = req.headers.cookie || '';
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // 클라이언트의 Cookie가 있으면 전달
        if (clientCookies) {
            headers['Cookie'] = clientCookies;
        }
        
        // 백엔드 API: GET /api/auth/check-email?email={email}
        const response = await axios.get(`${API_BASE_URL}/auth/check-email`, {
            params: { email },
            headers
        });
        
        console.log('이메일 중복 체크 응답:', response.data);
        
        return res.json(response.data);
    } catch (error) {
        console.error('=== 이메일 중복 체크 실패 ===');
        console.error('에러 타입:', error.constructor.name);
        
        if (error.response) {
            console.error('에러 응답 상태:', error.response.status);
            console.error('에러 응답 데이터:', JSON.stringify(error.response.data, null, 2));
            
            return res.status(error.response.status).json({ 
                message: error.response.data?.message || error.response.data?.error || '이메일 중복 체크 실패',
                available: false
            });
        } else if (error.request) {
            console.error('백엔드 서버에 연결할 수 없습니다.');
            return res.status(503).json({ 
                message: '백엔드 서버에 연결할 수 없습니다.',
                available: false
            });
        }
        
        console.error('요청 설정 오류:', error.message);
        res.status(500).json({ 
            message: '이메일 중복 체크 오류: ' + error.message,
            available: false
        });
    }
});

// 닉네임 중복 체크
router.get('/check-nickname', async (req, res) => {
    try {
        const { nickname } = req.query;
        
        if (!nickname) {
            return res.status(400).json({ message: '닉네임을 입력해주세요.' });
        }
        
        console.log('=== 닉네임 중복 체크 요청 ===');
        console.log('닉네임:', nickname);
        
        // 클라이언트의 Cookie를 백엔드로 전달 (회원가입 시에는 없을 수 있음)
        const clientCookies = req.headers.cookie || '';
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // 클라이언트의 Cookie가 있으면 전달
        if (clientCookies) {
            headers['Cookie'] = clientCookies;
        }
        
        // 백엔드 API: GET /api/auth/check-nickname?nickname={nickname}
        const response = await axios.get(`${API_BASE_URL}/auth/check-nickname`, {
            params: { nickname },
            headers
        });
        
        console.log('닉네임 중복 체크 응답:', response.data);
        
        return res.json(response.data);
    } catch (error) {
        console.error('=== 닉네임 중복 체크 실패 ===');
        console.error('에러 타입:', error.constructor.name);
        
        if (error.response) {
            console.error('에러 응답 상태:', error.response.status);
            console.error('에러 응답 데이터:', JSON.stringify(error.response.data, null, 2));
            
            return res.status(error.response.status).json({ 
                message: error.response.data?.message || error.response.data?.error || '닉네임 중복 체크 실패',
                available: false
            });
        } else if (error.request) {
            console.error('백엔드 서버에 연결할 수 없습니다.');
            return res.status(503).json({ 
                message: '백엔드 서버에 연결할 수 없습니다.',
                available: false
            });
        }
        
        console.error('요청 설정 오류:', error.message);
        res.status(500).json({ 
            message: '닉네임 중복 체크 오류: ' + error.message,
            available: false
        });
    }
});

// 현재 사용자 정보 조회
router.get('/me', async (req, res) => {
    if (req.session && req.session.userId) {
        // 세션에 저장된 정보 반환 (백엔드에서 image로 저장되어 있으면 profileImage로 변환)
        // profileImage나 image가 null, undefined, 빈 문자열, 'null'인 경우 null로 반환
        let profileImage = req.session.profileImage ?? req.session.image ?? null;
        
        // 빈 문자열, 'null' 문자열, undefined도 null로 처리
        if (profileImage === '' || profileImage === 'null' || profileImage === null || profileImage === undefined) {
            profileImage = null;
        } else if (typeof profileImage === 'string') {
            // 문자열인 경우 유효한 이미지 형식인지 확인
            const trimmed = profileImage.trim();
            if (trimmed === '' || 
                trimmed === 'null' || 
                (!trimmed.startsWith('data:image/') && 
                 !trimmed.startsWith('http://') && 
                 !trimmed.startsWith('https://') &&
                 !trimmed.startsWith('/'))) {
                // 유효하지 않은 형식이면 null로 처리
                profileImage = null;
            } else {
                profileImage = trimmed;
            }
        }
        
        console.log('/auth/me 응답 - 프로필 이미지 상태:', {
            profileImage: profileImage ? (profileImage.substring(0, 50) + '...') : 'null',
            sessionProfileImage: req.session.profileImage ? (typeof req.session.profileImage === 'string' ? req.session.profileImage.substring(0, 50) + '...' : req.session.profileImage) : 'null',
            sessionImage: req.session.image ? (typeof req.session.image === 'string' ? req.session.image.substring(0, 50) + '...' : req.session.image) : 'null'
        });
        
        return res.json({
            isLoggedIn: true,
            userId: req.session.userId,
            email: req.session.email,
            nickname: req.session.nickname,
            profileImage: profileImage // null이면 null로 반환 (이미지 없음)
        });
    }
    return res.json({ isLoggedIn: false });
});

// 비밀번호 변경 (인증 필요)
router.put('/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const token = req.session?.accessToken;

        if (!token) {
            return res.status(401).json({ message: '로그인이 필요합니다.' });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.' });
        }

        console.log('비밀번호 변경 요청:', { hasCurrentPassword: !!currentPassword, hasNewPassword: !!newPassword });

        // 백엔드 API: PUT /api/auth/change-password
        const response = await axios.put(`${API_BASE_URL}/auth/change-password`, {
            currentPassword,
            newPassword
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = response.data;
        console.log('비밀번호 변경 성공:', data);

        return res.json({ 
            message: '비밀번호가 성공적으로 변경되었습니다.',
            data: data
        });
    } catch (error) {
        console.error('비밀번호 변경 실패:', error);
        
        if (error.response) {
            const errorData = error.response.data;
            console.error('에러 응답:', {
                status: error.response.status,
                data: errorData
            });
            
            return res.status(error.response.status).json({ 
                message: errorData?.message || errorData?.error || '비밀번호 변경에 실패했습니다.' 
            });
        }
        
        if (error.request) {
            console.error('요청 전송 실패 - 백엔드 서버에 연결할 수 없습니다');
            return res.status(503).json({ message: '백엔드 서버에 연결할 수 없습니다.' });
        }
        
        res.status(500).json({ message: '비밀번호 변경 중 오류가 발생했습니다: ' + error.message });
    }
});

// 회원정보 수정 (인증 필요)
router.put('/update', async (req, res) => {
    try {
        const userId = req.session.userId;
        const token = getAccessToken(req);
        const { nickname, image } = req.body;

        if (!userId || !token) {
            return res.status(401).json({ message: '로그인이 필요합니다.' });
        }

        console.log('=== 회원정보 수정 요청 ===');
        console.log('userId:', userId);
        console.log('nickname:', nickname);
        console.log('image 타입:', typeof image);
        console.log('image 값 (처음 50자):', image ? (typeof image === 'string' ? image.substring(0, 50) + '...' : image) : image);

        // 클라이언트의 Cookie를 백엔드로 전달
        const clientCookies = req.headers.cookie || '';
        console.log('클라이언트 Cookie 존재:', !!clientCookies);
        
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
        
        // 클라이언트의 Cookie가 있으면 전달 (JSESSIONID, refreshToken 포함)
        if (clientCookies) {
            headers['Cookie'] = clientCookies;
        }

        // 백엔드 API: PUT /api/auth/update
        // 사용자가 제공한 API 형식과 동일하게 구현
        const requestPayload = {};
        if (nickname !== undefined) {
            requestPayload.nickname = nickname;
        }
        if (image !== undefined) {
            requestPayload.image = image; // 빈 문자열("")이면 삭제, 문자열(URL 또는 base64)이면 업데이트
        }

        console.log('백엔드로 전송할 데이터:', JSON.stringify(requestPayload, null, 2));
        console.log('백엔드 API 호출:', `${API_BASE_URL}/auth/update`);

        const response = await axios.put(`${API_BASE_URL}/auth/update`, requestPayload, {
            headers
        });

        const data = response.data;
        console.log('=== 회원정보 수정 성공 ===');
        console.log('백엔드 응답 상태:', response.status);
        console.log('백엔드 응답 데이터:', JSON.stringify(data, null, 2));
        console.log('요청 payload:', JSON.stringify(requestPayload, null, 2));

        // 세션 정보 업데이트
        // 백엔드 응답에서 user 객체 또는 직접 필드 확인
        const responseUser = data.user || data;
        if (responseUser?.nickname) {
            req.session.nickname = responseUser.nickname;
        }
        
        // 이미지 처리: 요청에 image: "" (빈 문자열)이 포함되었으면 무조건 삭제
        // 백엔드 응답에서 image 필드 확인
        const updatedImage = responseUser?.image ?? data.image ?? responseUser?.profileImage ?? data.profileImage;
        
        // 요청 payload에 image: "" (빈 문자열)이 있었는지 확인
        const wasImageDeleted = requestPayload.image === "" || requestPayload.image === null;
        
        console.log('이미지 처리 정보:', {
            wasImageDeleted: wasImageDeleted,
            updatedImage: updatedImage,
            updatedImageType: typeof updatedImage,
            updatedImageIsNull: updatedImage === null,
            updatedImageIsStringNull: updatedImage === 'null',
            updatedImageIsEmpty: updatedImage === ''
        });
        
        // 이미지 삭제 요청이 있었으면, 백엔드 응답과 관계없이 세션에서 무조건 삭제
        if (wasImageDeleted) {
            // 이미지 삭제 요청이었으면 세션에서 무조건 제거 (백엔드 응답 무시)
            // delete로 제거하고 null로 명시적으로 설정
            delete req.session.profileImage;
            delete req.session.image;
            req.session.profileImage = null;
            req.session.image = null;
            // 세션 저장을 강제하기 위해 touch 호출
            req.session.touch();
            console.log('세션에서 프로필 이미지 삭제 완료 (요청에 image: "" 또는 null 포함, 백엔드 응답 무시)');
            console.log('세션 삭제 후 확인:', {
                profileImage: req.session.profileImage,
                image: req.session.image,
                profileImageType: typeof req.session.profileImage,
                imageType: typeof req.session.image
            });
        } else if (updatedImage !== undefined && updatedImage !== null && updatedImage !== '' && updatedImage !== 'null') {
            // 이미지 업데이트 요청이었고, 응답에 유효한 이미지가 있으면 업데이트
            // null, 'null', 빈 문자열은 제외
            req.session.profileImage = updatedImage;
            req.session.image = updatedImage;
            const imagePreview = typeof updatedImage === 'string' && updatedImage.length > 50 
              ? updatedImage.substring(0, 50) + '...' 
              : updatedImage;
            console.log('세션에 프로필 이미지 업데이트 완료:', imagePreview);
        } else if (updatedImage === null || updatedImage === '' || updatedImage === 'null' || updatedImage === undefined) {
            // 응답에 null, 빈 문자열, 'null', undefined가 있으면 삭제
            delete req.session.profileImage;
            delete req.session.image;
            req.session.profileImage = null;
            req.session.image = null;
            req.session.touch();
            console.log('세션에서 프로필 이미지 삭제 완료 (응답에 null/빈값)');
        }

        console.log('세션 업데이트 완료:', {
            nickname: req.session.nickname,
            profileImage: req.session.profileImage || '없음 (삭제됨)',
            image: req.session.image || '없음 (삭제됨)'
        });

        // 세션 변경사항을 명시적으로 저장 후 응답
        // 이미지 삭제 시 세션 저장을 확실히 하기 위해 강제 저장
        req.session.save((err) => {
            if (err) {
                console.error('세션 저장 실패:', err);
                // 세션 저장 실패해도 응답은 보냄
            } else {
                console.log('세션 저장 완료');
                // 세션 저장 후 다시 확인
                console.log('세션 저장 후 최종 확인:', {
                    profileImage: req.session.profileImage,
                    image: req.session.image,
                    profileImageType: typeof req.session.profileImage,
                    imageType: typeof req.session.image
                });
            }
        });

        return res.json({ 
            message: '회원정보 수정 성공', 
            user: responseUser 
        });
    } catch (error) {
        console.error('=== 회원정보 수정 실패 ===');
        console.error('에러 타입:', error.constructor.name);
        
        if (error.response) {
            console.error('에러 응답 상태:', error.response.status);
            console.error('에러 응답 데이터:', JSON.stringify(error.response.data, null, 2));
            
            return res.status(error.response.status).json({ 
                message: error.response.data?.message || error.response.data?.error || '회원정보 수정 실패' 
            });
        } else if (error.request) {
            console.error('백엔드 서버에 연결할 수 없습니다.');
            return res.status(503).json({ message: '백엔드 서버에 연결할 수 없습니다.' });
        }
        
        console.error('요청 설정 오류:', error.message);
        res.status(500).json({ message: '회원정보 수정 오류: ' + error.message });
    }
});

// 토큰 갱신 (Refresh Token 사용)
router.post('/refresh', async (req, res) => {
    try {
        console.log('=== 토큰 갱신 요청 ===');
        
        // 클라이언트의 Cookie를 백엔드로 전달
        const clientCookies = req.headers.cookie || '';
        console.log('클라이언트 Cookie 존재:', !!clientCookies);
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // 클라이언트의 Cookie가 있으면 전달 (JSESSIONID, refreshToken 포함)
        if (clientCookies) {
            headers['Cookie'] = clientCookies;
        }
        
        // 백엔드 API: POST /api/auth/refresh
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
            headers
        });

        const data = response.data;
        console.log('토큰 갱신 응답:', {
            hasAccessToken: !!data.accessToken,
            hasToken: !!data.token
        });

        // 새 액세스 토큰으로 세션 업데이트
        const newAccessToken = data.accessToken || data.token;
        if (newAccessToken) {
            req.session.accessToken = newAccessToken;
        
        req.session.save((err) => {
            if (err) {
                    console.error('세션 저장 실패:', err);
                return res.status(500).json({ message: '세션 업데이트 실패' });
            }
                console.log('토큰 갱신 성공, 세션 업데이트 완료');
                return res.json({ 
                    message: '토큰 갱신 성공',
                    accessToken: newAccessToken 
                });
            });
        } else {
            console.error('토큰 갱신 응답에 accessToken이 없습니다:', data);
            return res.status(500).json({ message: '토큰 갱신 응답 형식 오류' });
        }
    } catch (error) {
        console.error('=== 토큰 갱신 실패 ===');
        console.error('에러 타입:', error.constructor.name);
        
        if (error.response) {
            console.error('에러 응답 상태:', error.response.status);
            console.error('에러 응답 데이터:', JSON.stringify(error.response.data, null, 2));
            
            if (error.response.status === 401) {
                // 리프레시 토큰도 만료된 경우 세션 삭제
                console.log('리프레시 토큰 만료, 세션 삭제');
                req.session.destroy();
                return res.status(401).json({ 
                    message: '세션이 만료되었습니다. 다시 로그인해주세요.',
                    code: 'REFRESH_TOKEN_EXPIRED'
                });
            }
            
            return res.status(error.response.status).json({
                message: error.response.data?.message || '토큰 갱신 실패',
                code: error.response.data?.code || 'REFRESH_FAILED'
            });
        } else if (error.request) {
            console.error('백엔드 서버에 연결할 수 없습니다.');
            return res.status(503).json({ message: '백엔드 서버에 연결할 수 없습니다.' });
        }
        
        console.error('요청 설정 오류:', error.message);
        res.status(500).json({ message: '토큰 갱신 오류: ' + error.message });
    }
});

module.exports = router;


