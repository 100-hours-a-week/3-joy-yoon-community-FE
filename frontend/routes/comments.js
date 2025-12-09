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
    
    if (isTokenExpired(token)) {
        return res.status(401).json({ message: '토큰이 만료되었습니다.', code: 'TOKEN_EXPIRED' });
    }
    
    next();
};

// 댓글 목록 조회 (인증 불필요하지만 세션이 있으면 토큰 전달)
router.get('/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        
        // 세션에 토큰이 있으면 헤더에 추가
        const headers = { 'Content-Type': 'application/json' };
        if (req.session && req.session.accessToken) {
            headers['Authorization'] = `Bearer ${req.session.accessToken}`;
        }
        
        const response = await axios.get(`${API_BASE_URL}/boards/${postId}/comments`, {
            headers
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('댓글 목록 조회 실패:', error);
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        } else if (error.request) {
            console.error('백엔드 서버에 연결할 수 없습니다.');
            return res.status(503).json({ message: '백엔드 서버에 연결할 수 없습니다.' });
        }
        res.status(500).json({ message: '댓글 목록 조회 오류' });
    }
});

// 댓글 작성 (인증 필요)
router.post('/:postId', requireAuth, async (req, res) => {
    console.log('[댓글 작성 요청]', req.params, req.body);
    
    try {
        const { postId } = req.params;
        const { contents } = req.body;
        const userId = req.session.userId;
        const token = getAccessToken(req);

        const response = await axios.post(`${API_BASE_URL}/boards/${postId}/comments`, {
            contents
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            }
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('댓글 작성 실패:', error);
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        } else if (error.request) {
            console.error('백엔드 서버에 연결할 수 없습니다.');
            return res.status(503).json({ message: '백엔드 서버에 연결할 수 없습니다.' });
        }
        res.status(500).json({ message: '댓글 등록 오류' });
    }
});

// 댓글 수정 (인증 필요)
router.put('/:postId/:commentId', requireAuth, async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const { contents } = req.body;
        const userId = req.session.userId;
        const token = getAccessToken(req);

        const response = await axios.put(`${API_BASE_URL}/boards/${postId}/comments/${commentId}`, {
            contents
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            }
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('댓글 수정 실패:', error);
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        } else if (error.request) {
            console.error('백엔드 서버에 연결할 수 없습니다.');
            return res.status(503).json({ message: '백엔드 서버에 연결할 수 없습니다.' });
        }
        res.status(500).json({ message: '댓글 수정 오류' });
    }
});

// 댓글 삭제 (인증 필요)
router.delete('/:postId/:commentId', requireAuth, async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const userId = req.session.userId;
        const token = getAccessToken(req);

        const response = await axios.delete(`${API_BASE_URL}/boards/${postId}/comments/${commentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });

        if (response.status === 204) {
            return res.status(204).send();
        }

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('댓글 삭제 실패:', error);
        if (error.response) {
            if (error.response.status === 204) {
                return res.status(204).send();
            }
            return res.status(error.response.status).json(error.response.data);
        } else if (error.request) {
            console.error('백엔드 서버에 연결할 수 없습니다.');
            return res.status(503).json({ message: '백엔드 서버에 연결할 수 없습니다.' });
        }
        res.status(500).json({ message: '댓글 삭제 오류' });
    }
});

module.exports = router;
