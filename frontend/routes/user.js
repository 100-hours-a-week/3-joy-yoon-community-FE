const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getAccessToken } = require('../utils/tokenStore');

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
    
    next();
};

// 사용자 정보 조회 (인증 불필요, 공개 정보만)
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // 세션에 토큰이 있으면 헤더에 추가
        const headers = { 'Content-Type': 'application/json' };
        if (req.session && req.session.accessToken) {
            headers['Authorization'] = `Bearer ${req.session.accessToken}`;
        }
        
        // 백엔드 API: GET /api/users/{userId}
        const response = await axios.get(`${API_BASE_URL}/users/${userId}`, {
            headers
        });

        const data = response.data;
        
        // 공개 정보만 반환 (프로필 이미지, 닉네임 등)
        res.json({
            userId: data.userId || data.id,
            nickname: data.nickname,
            profileImage: data.image || data.profileImage,
            image: data.image || data.profileImage
        });
    } catch (error) {
        console.error('사용자 정보 조회 실패:', error);
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        }
        res.status(500).json({ message: '사용자 정보 조회 오류' });
    }
});

// 회원정보 수정 (인증 필요)
router.put('/:userId', requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const sessionUserId = req.session.userId;
        const token = getAccessToken(req);
        const { nickname, profileImage, image } = req.body;

        // 본인만 수정 가능
        if (String(sessionUserId) !== String(userId)) {
            return res.status(403).json({ message: '본인의 정보만 수정할 수 있습니다.' });
        }

        // profileImage를 image 필드로 변환 (백엔드 users.image 필드에 저장)
        // image가 명시적으로 null이면 삭제 요청, undefined가 아니면 업데이트
        const imageToUpdate = image !== undefined ? image : (profileImage !== undefined ? profileImage : undefined);

        console.log('회원정보 수정 요청:', { 
            userId, 
            nickname, 
            hasImage: imageToUpdate !== null && imageToUpdate !== undefined,
            isImageNull: imageToUpdate === null,
            imageType: typeof imageToUpdate
        });

        // 백엔드 API: PUT /api/users/{userId} - image 필드로 전송
        const requestPayload = { nickname };
        
        // image가 명시적으로 전달된 경우 (null이거나 문자열)
        if (imageToUpdate !== undefined) {
            requestPayload.image = imageToUpdate; // null이면 삭제, 문자열이면 업데이트
        }

        const response = await axios.put(`${API_BASE_URL}/users/${userId}`, requestPayload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            }
        });

        const data = response.data;
        console.log('회원정보 수정 성공:', data);

        // 세션 정보 업데이트
        if (data.nickname) {
            req.session.nickname = data.nickname;
        }
        // 백엔드에서 image 필드로 반환되면 profileImage로도 저장
        const updatedImage = data.image ?? data.profileImage;
        if (updatedImage !== undefined) {
            req.session.profileImage = updatedImage;
            req.session.image = updatedImage;
        }

        return res.json({ 
            message: '회원정보 수정 성공', 
            user: data.user || data 
        });
    } catch (error) {
        console.error('회원정보 수정 실패:', error);
        if (error.response) {
            console.error('에러 응답:', {
                status: error.response.status,
                data: error.response.data
            });
            return res.status(error.response.status).json({ 
                message: error.response.data?.message || error.response.data?.error || '회원정보 수정 실패' 
            });
        }
        if (error.request) {
            console.error('요청 전송 실패 - 백엔드 서버에 연결할 수 없습니다');
            return res.status(503).json({ message: '백엔드 서버에 연결할 수 없습니다.' });
        }
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;

