/**
 * 세션 기반 토큰 관리 유틸리티
 * 
 * 주의: 이 파일은 이전 버전과의 호환성을 위해 유지됩니다.
 * 새로운 코드에서는 req.session.accessToken을 직접 사용하세요.
 * 
 * 토큰은 세션에 저장되며, 세션은 서버의 메모리/스토어에 보관됩니다.
 * 클라이언트는 세션 ID만 쿠키로 받아 httpOnly로 보호됩니다.
 */

/**
 * 세션에서 액세스 토큰 가져오기
 * @param {Object} req - Express request 객체
 * @returns {string|null} accessToken 또는 null
 */
function getAccessToken(req) {
    if (!req || !req.session) {
        return null;
    }
    return req.session.accessToken || null;
}

/**
 * 세션에 액세스 토큰 저장
 * @param {Object} req - Express request 객체
 * @param {string} token - 저장할 토큰
 */
function setAccessToken(req, token) {
    if (req && req.session) {
        req.session.accessToken = token;
    }
}

/**
 * 세션에서 액세스 토큰 삭제
 * @param {Object} req - Express request 객체
 */
function clearAccessToken(req) {
    if (req && req.session) {
        delete req.session.accessToken;
    }
}

/**
 * 토큰 유효성 검사 (간단한 형식 체크)
 * @param {string} token - 검사할 토큰
 * @returns {boolean}
 */
function isValidToken(token) {
    if (!token || typeof token !== 'string') {
        return false;
    }
    // JWT 형식 검사 (header.payload.signature)
    const parts = token.split('.');
    return parts.length === 3;
}

/**
 * 토큰 만료 여부 확인 (JWT 디코딩)
 * @param {string} token - 검사할 토큰
 * @returns {boolean} 만료되었으면 true
 */
function isTokenExpired(token) {
    if (!isValidToken(token)) {
        return true;
    }
    
    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        const exp = payload.exp;
        
        if (!exp) {
            return false; // exp가 없으면 만료되지 않은 것으로 처리
        }
        
        // 현재 시간과 비교 (5초 여유)
        return Date.now() >= (exp * 1000) - 5000;
    } catch (error) {
        return true; // 파싱 실패 시 만료된 것으로 처리
    }
}

module.exports = { 
    getAccessToken, 
    setAccessToken, 
    clearAccessToken,
    isValidToken,
    isTokenExpired
};
