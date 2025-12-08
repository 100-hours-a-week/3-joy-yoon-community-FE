// public/js/config.js
// 프론트엔드 설정 파일

window.CONFIG = {
  // 백엔드 API 기본 URL
  API_BASE_URL: 'http://localhost:8080',
  
  // 프론트엔드 서버 URL (Express)
  FRONTEND_URL: 'http://localhost:3000',
  
  // 페이지네이션 기본값
  DEFAULT_PAGE_SIZE: 10,
  
  // 토스트 메시지 지속 시간 (ms)
  TOAST_DURATION: 3000,
  
  // 세션 체크 간격 (ms) - 15분마다 세션 유효성 확인
  SESSION_CHECK_INTERVAL: 15 * 60 * 1000,
};
