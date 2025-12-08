const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getAccessToken, isTokenExpired } = require('../utils/tokenStore');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080/api';

// 인증 미들웨어
const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ message: '로그인이 필요합니다.' });
    }
    
    const token = getAccessToken(req);
    if (!token) {
        return res.status(401).json({ message: '인증 토큰이 없습니다.' });
    }
    
    // 토큰 만료 체크
    if (isTokenExpired(token)) {
        return res.status(401).json({ message: '토큰이 만료되었습니다.', code: 'TOKEN_EXPIRED' });
    }
    
    next();
};

// 게시글 목록 조회 (인증 불필요하지만 세션이 있으면 토큰 전달)
router.get('/', async (req, res) => {
    try {
        const { page = 0, size = 10 } = req.query;
        
        // 세션에 토큰이 있으면 헤더에 추가
        const headers = { 'Content-Type': 'application/json' };
        if (req.session && req.session.accessToken) {
            headers['Authorization'] = `Bearer ${req.session.accessToken}`;
        }
        
        const response = await axios.get(`${API_BASE_URL}/boards?page=${page}&size=${size}`, {
            headers
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('게시글 목록 조회 실패:', error);
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        }
        res.status(500).json({ message: '게시글 목록 조회 오류' });
    }
});

// 게시글 상세 조회 (인증 불필요하지만 세션이 있으면 토큰 전달)
router.get('/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        
        // 세션에 토큰이 있으면 헤더에 추가
        const headers = { 'Content-Type': 'application/json' };
        if (req.session && req.session.accessToken) {
            headers['Authorization'] = `Bearer ${req.session.accessToken}`;
        }
        
        const response = await axios.get(`${API_BASE_URL}/boards/${postId}`, {
            headers
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('게시글 상세 조회 실패:', error);
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        }
        res.status(500).json({ message: '게시글 조회 오류' });
    }
});

// 게시글 작성 (인증 필요)
router.post('/', requireAuth, async (req, res) => {
    try {
        const token = getAccessToken(req);
        const { title, contents } = req.body;

        console.log('=== 게시글 작성 요청 ===');
        console.log('제목:', title);
        console.log('내용:', contents);
        console.log('토큰 존재:', !!token);
        console.log('사용자 ID:', req.session.userId);

        if (!title || !contents) {
            return res.status(400).json({ message: '제목과 내용을 모두 입력해주세요.' });
        }

        if (!token) {
            return res.status(401).json({ message: '인증 토큰이 없습니다.' });
        }

        // 백엔드 API: POST /api/boards (사용자가 제공한 형식과 일치)
        const requestPayload = {
            title,
            contents
        };

        console.log('백엔드로 전송할 데이터:', JSON.stringify(requestPayload, null, 2));

        const response = await axios.post(`${API_BASE_URL}/boards`, requestPayload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            }
        });

        console.log('백엔드 응답:', response.status, response.data);

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('=== 게시글 작성 실패 ===');
        console.error('에러 타입:', error.constructor.name);
        
        if (error.response) {
            // 서버가 응답했지만 에러 상태 코드
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
            
            return res.status(error.response.status).json(error.response.data);
        } else if (error.request) {
            // 요청은 보냈지만 응답을 받지 못함
            console.error('백엔드 서버에 연결할 수 없습니다.');
            return res.status(503).json({ message: '백엔드 서버에 연결할 수 없습니다.' });
        } else {
            // 요청 설정 중 오류
            console.error('요청 설정 오류:', error.message);
            return res.status(500).json({ message: '게시글 등록 오류: ' + error.message });
        }
    }
});

// 게시글 수정 (인증 필요)
router.put('/:postId', requireAuth, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.session.userId;
        const token = getAccessToken(req);
        const { title, contents } = req.body;

        console.log('게시글 수정 요청:', { postId, userId, title, contents });

        // 백엔드 API: PUT /api/boards/{postId}
        const response = await axios.put(`${API_BASE_URL}/boards/${postId}`, {
            title,
            contents
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            }
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('게시글 수정 실패:', error);
        if (error.response) {
            console.error('에러 응답 상태:', error.response.status);
            console.error('에러 응답 데이터:', JSON.stringify(error.response.data, null, 2));
            
            // 권한 없음 에러 (403)
            if (error.response.status === 403) {
                const errorData = error.response.data;
                return res.status(403).json({ 
                    message: errorData?.message || '게시글을 수정할 권한이 없습니다. 작성자만 수정할 수 있습니다.',
                    code: 'FORBIDDEN'
                });
            }
            
            return res.status(error.response.status).json(error.response.data);
        }
        res.status(500).json({ message: '게시글 수정 오류' });
    }
});

// 게시글 삭제 (인증 필요)
router.delete('/:postId', requireAuth, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.session.userId;
        const token = getAccessToken(req);

        console.log('=== 게시글 삭제 요청 ===');
        console.log('postId:', postId);
        console.log('세션 userId:', userId);
        console.log('토큰 존재:', !!token);
        console.log('토큰 (처음 20자):', token ? token.substring(0, 20) + '...' : '없음');
        
        // 토큰에서 userId 추출하여 확인
        if (token) {
            try {
                const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                console.log('토큰에서 추출한 정보:', {
                    sub: payload.sub,
                    email: payload.email,
                    type: payload.type
                });
                console.log('토큰의 userId (sub):', payload.sub);
                console.log('세션의 userId:', userId);
                console.log('일치 여부:', String(payload.sub) === String(userId));
            } catch (e) {
                console.error('토큰 디코딩 실패:', e);
            }
        }

        if (!token) {
            console.error('토큰이 없습니다!');
            return res.status(401).json({ 
                message: '인증 토큰이 없습니다.',
                code: 'UNAUTHORIZED'
            });
        }

        // 백엔드 API: DELETE /api/boards/{postId}
        // 사용자가 제공한 API 형식과 동일하게 구현
        // Cookie 전달: 클라이언트의 Cookie를 백엔드로 전달
        const clientCookies = req.headers.cookie || '';
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        // 클라이언트의 Cookie가 있으면 전달
        if (clientCookies) {
            headers['Cookie'] = clientCookies;
        }
        
        const response = await axios.delete(`${API_BASE_URL}/boards/${postId}`, {
            headers
        });

        console.log('백엔드 삭제 응답:', response.status, response.data);

        if (response.status === 204) {
            return res.status(204).send();
        }

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('=== 게시글 삭제 실패 ===');
        console.error('에러 타입:', error.constructor.name);
        
        if (error.response) {
            console.error('에러 응답 상태:', error.response.status);
            console.error('에러 응답 데이터:', JSON.stringify(error.response.data, null, 2));
            console.error('에러 응답 헤더:', error.response.headers);
            
            // 토큰 만료 에러인 경우
            if (error.response.status === 401) {
                const errorData = error.response.data;
                return res.status(401).json({ 
                    message: errorData?.message || '인증이 필요합니다.',
                    code: errorData?.code || 'UNAUTHORIZED'
                });
            }
            
            // 권한 없음 에러 (403)
            if (error.response.status === 403) {
                const errorData = error.response.data;
                console.error('403 에러 상세:', {
                    message: errorData?.message,
                    code: errorData?.code,
                    전체응답: errorData
                });
                return res.status(403).json({ 
                    message: errorData?.message || '게시글을 삭제할 권한이 없습니다. 작성자만 삭제할 수 있습니다.',
                    code: 'FORBIDDEN',
                    details: errorData // 상세 정보 포함
                });
            }
            
            if (error.response.status === 204) {
                return res.status(204).send();
            }
            return res.status(error.response.status).json(error.response.data);
        } else if (error.request) {
            console.error('백엔드 서버에 연결할 수 없습니다.');
            return res.status(503).json({ message: '백엔드 서버에 연결할 수 없습니다.' });
        }
        
        console.error('요청 설정 오류:', error.message);
        res.status(500).json({ message: '게시글 삭제 오류: ' + error.message });
    }
});

// 좋아요 토글 (인증 필요)
router.post('/:postId/likes', requireAuth, async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.session.userId;
        const token = getAccessToken(req);

        console.log('=== 좋아요 요청 ===');
        console.log('postId:', postId);
        console.log('userId:', userId);

        // 클라이언트의 Cookie를 백엔드로 전달
        const clientCookies = req.headers.cookie || '';
        
        const headers = {
            'Authorization': `Bearer ${token}`
        };
        
        // 클라이언트의 Cookie가 있으면 전달
        if (clientCookies) {
            headers['Cookie'] = clientCookies;
        }

        // 백엔드 API: POST /api/boards/{postId}/likes
        // 백엔드는 body를 받지 않으므로 빈 body로 전송
        const response = await axios.post(`${API_BASE_URL}/boards/${postId}/likes`, {}, {
            headers
        });

        console.log('백엔드 좋아요 응답:', response.status, response.data);

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('=== 좋아요 처리 실패 ===');
        console.error('에러 타입:', error.constructor.name);
        
        if (error.response) {
            console.error('에러 응답 상태:', error.response.status);
            console.error('에러 응답 데이터:', JSON.stringify(error.response.data, null, 2));
            return res.status(error.response.status).json(error.response.data);
        } else if (error.request) {
            console.error('백엔드 서버에 연결할 수 없습니다.');
            return res.status(503).json({ message: '백엔드 서버에 연결할 수 없습니다.' });
        }
        
        console.error('요청 설정 오류:', error.message);
        res.status(500).json({ message: '좋아요 처리 오류: ' + error.message });
    }
});

module.exports = router;
