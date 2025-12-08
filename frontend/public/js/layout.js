/**
 * 공통 레이아웃 로더
 * 모든 페이지에서 header와 footer를 동적으로 로드합니다.
 */

(function() {
    'use strict';

    // 레이아웃 컴포넌트 로드
    async function loadLayout() {
        try {
            // Header 로드
            const headerPlaceholder = document.getElementById('header-placeholder');
            if (headerPlaceholder) {
                try {
                    const headerRes = await axios.get('/components/header.html');
                    const headerHtml = headerRes.data;
                    headerPlaceholder.outerHTML = headerHtml;
                    await updateHeaderNav();
                } catch (err) {
                    console.error('Header 로드 실패:', err);
                }
            }

            // Footer 로드
            const footerPlaceholder = document.getElementById('footer-placeholder');
            if (footerPlaceholder) {
                try {
                    const footerRes = await axios.get('/components/footer.html');
                    const footerHtml = footerRes.data;
                    footerPlaceholder.outerHTML = footerHtml;
                } catch (err) {
                    console.error('Footer 로드 실패:', err);
                }
            }
        } catch (error) {
            console.error('레이아웃 로드 실패:', error);
        }
    }

    // 로그인 상태에 따른 헤더 네비게이션 업데이트
    async function updateHeaderNav() {
        const nav = document.getElementById('headerNav');
        if (!nav) return;

        try {
            const response = await axios.get('/auth/me', {
                withCredentials: true
            });
            const data = response.data;

            if (data.isLoggedIn) {
                // 로그인 상태
                const initial = (data.nickname || data.email || 'U').charAt(0).toUpperCase();
                // 프로필 이미지 유효성 검사 (빈 문자열, null, 'null', undefined 제외)
                const hasValidProfileImage = data.profileImage && 
                    data.profileImage !== null && 
                    data.profileImage !== 'null' && 
                    data.profileImage !== '' && 
                    data.profileImage.trim() !== '';
                
                nav.innerHTML = `
                    <div class="user-menu">
                        <div class="user-avatar" id="userAvatar">
                            ${hasValidProfileImage 
                                ? `<img src="${data.profileImage}" alt="프로필" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
                                : ''
                            }
                            <span class="avatar-initial" style="${hasValidProfileImage ? 'display: none;' : ''}">${initial}</span>
                        </div>
                        <ul class="dropdown" id="userDropdown">
                            <li><a href="/profile-modify">회원정보 수정</a></li>
                            <li><a href="/change-password">비밀번호 변경</a></li>
                            <li><a href="#" id="logoutBtn">로그아웃</a></li>
                        </ul>
                    </div>
                `;

                // 드롭다운 토글
                const avatar = document.getElementById('userAvatar');
                const dropdown = document.getElementById('userDropdown');
                
                avatar.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdown.classList.toggle('show');
                });

                // 외부 클릭 시 드롭다운 닫기
                document.addEventListener('click', () => {
                    dropdown.classList.remove('show');
                });

                // 로그아웃 처리
                const logoutBtn = document.getElementById('logoutBtn');
                logoutBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    try {
                        await axios.post('/auth/logout', {}, {
                            withCredentials: true
                        });
                        window.location.href = '/login';
                    } catch (err) {
                        console.error('로그아웃 실패:', err);
                    }
                });
            } else {
                // 비로그인 상태
                nav.innerHTML = `
                    <a href="/login">로그인</a>
                    <a href="/signup">회원가입</a>
                `;
            }
        } catch (error) {
            // API 실패 시 기본 네비게이션 표시
            nav.innerHTML = `
                <a href="/login">로그인</a>
                <a href="/signup">회원가입</a>
            `;
        }
    }

    // 토스트 메시지 표시 함수 (전역으로 사용 가능)
    window.showToast = function(message, duration = 3000) {
        let toast = document.getElementById('globalToast');
        
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'globalToast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    };

    // 인증 체크 함수 (전역으로 사용 가능)
    window.checkAuth = async function() {
        try {
            const response = await axios.get('/auth/me', {
                withCredentials: true
            });
            return response.data;
        } catch (error) {
            return { isLoggedIn: false };
        }
    };

    // 인증이 필요한 API 호출을 위한 래퍼 (전역으로 사용 가능)
    window.authAxios = async function(url, options = {}) {
        try {
            const config = {
                ...options,
                withCredentials: true
            };
            
            const response = await axios(url, config);

            return response;
        } catch (error) {
            // 토큰 만료 시 자동 갱신 시도
            if (error.response?.status === 401) {
                const data = error.response.data;
                
                if (data.code === 'TOKEN_EXPIRED') {
                    try {
                        // 토큰 갱신 시도
                        await axios.post('/auth/refresh', {}, {
                            withCredentials: true
                        });
                        
                        // 갱신 성공 시 원래 요청 재시도
                        return await axios(url, config);
                    } catch (refreshError) {
                        // 갱신 실패 시 로그아웃 후 로그인 페이지로 이동
                        try {
                            await axios.post('/auth/logout', {}, {
                                withCredentials: true
                            });
                        } catch (logoutError) {
                            console.error('로그아웃 실패:', logoutError);
                        }
                        window.location.href = '/login';
                        throw refreshError;
                    }
                } else {
                    // 다른 인증 오류 시 로그아웃 후 로그인 페이지로 이동
                    try {
                        await axios.post('/auth/logout', {}, {
                            withCredentials: true
                        });
                    } catch (logoutError) {
                        console.error('로그아웃 실패:', logoutError);
                    }
                    window.location.href = '/login';
                }
            }
            
            console.error('API 호출 실패:', error);
            throw error;
        }
    };

    // DOM 로드 완료 시 실행
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadLayout);
    } else {
        loadLayout();
    }
})();
