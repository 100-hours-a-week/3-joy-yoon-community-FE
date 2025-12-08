document.addEventListener("DOMContentLoaded", async () => {
  const editForm = document.getElementById("editForm");
  const titleInput = document.getElementById("title");
  const contentInput = document.getElementById("content");
  const updateBtn = document.getElementById("updateBtn");
  const btnBack = document.getElementById("btnBack");
  const modalOverlay = document.getElementById("modalOverlay");
  const modalTitle = document.getElementById("modalTitle");
  const modalMessage = document.getElementById("modalMessage");
  const btnModalConfirm = document.getElementById("btnModalConfirm");
  
  let tokenExpired = false; // 토큰 만료 플래그
  
  // URL에서 게시글 ID 가져오기
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get("id");
  
  // 목록으로 버튼
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      window.location.href = '/post-list';
    });
  }
  
  // 모달 확인 버튼
  if (btnModalConfirm) {
    btnModalConfirm.addEventListener('click', async () => {
      if (tokenExpired) {
        try {
          // 로그아웃 API 호출
          await axios.post('/auth/logout', {}, {
            withCredentials: true
          });
        } catch (error) {
          console.error('로그아웃 실패:', error);
        } finally {
          // 모달 닫기
          if (modalOverlay) modalOverlay.classList.remove('active');
          tokenExpired = false;
          // 로그인 페이지로 이동
          window.location.href = '/login';
        }
      }
    });
  }

  if (!postId) {
    alert("게시글을 찾을 수 없습니다.");
    window.location.href = "/post-list";
    return;
  }

  // 현재 사용자 정보 가져오기
  let currentUserId = null;
  try {
    const userResponse = await axios.get("/auth/me", {
      withCredentials: true
    });
    if (userResponse.data && userResponse.data.isLoggedIn) {
      currentUserId = userResponse.data.userId;
    }
  } catch (error) {
    console.error("사용자 정보 로드 실패:", error);
  }

  // 게시글 정보 로드 및 작성자 확인
  try {
    const postResponse = await axios.get(`/boards/${postId}`, {
      withCredentials: true
    });
    
    const post = postResponse.data;
    
    // 게시글 작성자 userId 확인
    const postAuthorId = post.userId || post.authorId || post.writerId || post.user?.userId || post.user?.id || post.authorUserId;
    
    console.log('게시글 작성자 확인:', {
      currentUserId,
      postAuthorId,
      postData: post
    });
    
    // 작성자 확인 (userId로만 비교, 닉네임 비교 제거)
    const currentUserIdStr = currentUserId ? String(currentUserId) : null;
    const postAuthorIdStr = postAuthorId ? String(postAuthorId) : null;
    const isAuthor = currentUserIdStr && postAuthorIdStr && currentUserIdStr === postAuthorIdStr;
    
    if (!postAuthorId) {
      console.error('게시글 작성자 userId를 찾을 수 없습니다.');
      console.error('게시글 데이터:', post);
      alert("게시글 작성자 정보를 확인할 수 없습니다. 백엔드 API가 작성자 userId를 반환해야 합니다.");
      window.location.href = `/post-detail?id=${postId}`;
      return;
    }
    
    // 작성자가 아니면 접근 차단
    if (!isAuthor) {
      console.log('작성자가 아님:', {
        currentUserId: currentUserIdStr,
        postAuthorId: postAuthorIdStr
      });
      alert("게시글 작성자만 수정할 수 있습니다.");
      window.location.href = `/post-detail?id=${postId}`;
      return;
    }
    
    console.log('작성자 확인됨 - 수정 페이지 접근 허용');

    // 폼에 기존 데이터 채우기
    if (titleInput) titleInput.value = post.title || "";
    if (contentInput) contentInput.value = post.contents || post.content || "";

  } catch (error) {
    console.error("게시글 로드 실패:", error);
    const errorMessage = error.response?.data?.message || error.message || "게시글을 불러오는데 실패했습니다.";
    alert(errorMessage);
    window.location.href = "/post-list";
    return;
  }

  // 제목 길이 초과 방지 (26자 제한)
  if (titleInput) {
    titleInput.addEventListener("input", () => {
      if (titleInput.value.length > 26) {
        titleInput.value = titleInput.value.slice(0, 26);
        alert("제목은 최대 26자까지 입력 가능합니다.");
      }
    });
  }

  // 토큰 만료 처리 함수
  async function handleTokenExpired() {
    // 토큰 만료 플래그 설정
    tokenExpired = true;
    
    // 모달 표시
    if (modalTitle) modalTitle.textContent = '세션이 만료되었습니다';
    if (modalMessage) modalMessage.textContent = '토큰이 만료되어 로그아웃됩니다. 다시 로그인해주세요.';
    if (modalOverlay) modalOverlay.classList.add('active');
  }

  // 토큰 갱신 후 API 재시도 헬퍼 함수
  async function retryWithTokenRefresh(apiCall) {
    try {
      return await apiCall();
    } catch (error) {
      // 토큰 만료 에러인 경우
      if (error.response?.status === 401) {
        const errorData = error.response.data;
        
        // 토큰 만료 코드 확인
        if (errorData?.code === 'TOKEN_EXPIRED' || errorData?.message?.includes('토큰') || errorData?.message?.includes('만료')) {
          console.log('토큰 만료 감지, 갱신 시도...');
          
          try {
            // 토큰 갱신 시도
            await axios.post('/auth/refresh', {}, {
              withCredentials: true
            });
            
            console.log('토큰 갱신 성공, 원래 요청 재시도...');
            
            // 갱신 성공 시 원래 요청 재시도
            return await apiCall();
          } catch (refreshError) {
            console.error('토큰 갱신 실패:', refreshError);
            // 갱신 실패 시 모달 표시 후 로그아웃 및 로그인 페이지로 이동
            await handleTokenExpired();
            throw refreshError;
          }
        } else {
          // 다른 인증 오류
          throw error;
        }
      } else {
        // 다른 에러
        throw error;
      }
    }
  }

  // 폼 제출
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const title = titleInput?.value || "";
      const contents = contentInput?.value || "";

      try {
        // 토큰 만료 시 자동 갱신 후 재시도
        await retryWithTokenRefresh(async () => {
          return await axios.put(`/boards/${postId}`, {
            title,
            contents
          }, {
            headers: {
              'Content-Type': 'application/json'
            },
            withCredentials: true
          });
        });

        alert("게시글이 수정되었습니다.");
        window.location.href = `/post-detail?id=${postId}`;
      } catch (error) {
        console.error('게시글 수정 실패:', error);
        console.error('에러 응답:', error.response?.status, error.response?.data);
        
        let errorMessage = "수정에 실패했습니다.";
        
        if (error.response) {
          const errorData = error.response.data;
          
          if (error.response.status === 403) {
            errorMessage = errorData?.message || '게시글을 수정할 권한이 없습니다. 작성자만 수정할 수 있습니다.';
          } else if (error.response.status === 401) {
            errorMessage = errorData?.message || '인증이 필요합니다. 다시 로그인해주세요.';
          } else if (error.response.status === 500) {
            errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          }
        } else if (error.request) {
          errorMessage = '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.';
        }
        
        alert(errorMessage);
      }
    });
  }
});
