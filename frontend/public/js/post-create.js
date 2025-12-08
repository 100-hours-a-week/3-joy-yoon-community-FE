document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('postForm');
  const titleInput = document.getElementById('title');
  const contentInput = document.getElementById('content');
  const imageInput = document.getElementById('imageUpload');
  const imagePreview = document.getElementById('imagePreview');
  const submitBtn = document.getElementById('submitBtn');
  const toast = document.getElementById('toastMsg');
  const titleError = document.getElementById('titleError');
  const contentError = document.getElementById('contentError');

  if (!form || !titleInput || !contentInput || !submitBtn) {
    console.error('필수 폼 요소를 찾을 수 없습니다.');
    return;
  }

  // 제출 버튼 활성화/비활성화 함수
  function updateSubmitButton() {
    const title = titleInput.value.trim();
    const contents = contentInput.value.trim();
    const isValid = title.length > 0 && contents.length > 0;
    
    submitBtn.disabled = !isValid;
    
    if (isValid) {
      submitBtn.classList.remove('disabled');
    } else {
      submitBtn.classList.add('disabled');
    }
  }

  // 제목 입력 시 버튼 상태 업데이트
  titleInput.addEventListener('input', updateSubmitButton);
  titleInput.addEventListener('keyup', updateSubmitButton);

  // 내용 입력 시 버튼 상태 업데이트
  contentInput.addEventListener('input', updateSubmitButton);
  contentInput.addEventListener('keyup', updateSubmitButton);

  // 이미지 미리보기 영역 클릭 시 파일 입력 트리거
  if (imagePreview && imageInput) {
    imagePreview.style.cursor = 'pointer';
    imagePreview.addEventListener('click', () => {
      imageInput.click();
    });

    // 파일 선택 시 미리보기 표시
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // 파일 크기 확인 (10MB 제한)
        if (file.size > 10 * 1024 * 1024) {
          alert('이미지 크기는 10MB 이하여야 합니다.');
          imageInput.value = '';
          imagePreview.innerHTML = '📷 클릭하여 작품 사진을 올려주세요';
          return;
        }

        // 이미지 미리보기
        const reader = new FileReader();
        reader.onload = (e) => {
          imagePreview.style.display = 'flex';
          imagePreview.style.flexDirection = 'column';
          imagePreview.style.alignItems = 'center';
          imagePreview.style.justifyContent = 'center';
          imagePreview.style.padding = '16px';
          imagePreview.innerHTML = `
            <img src="${e.target.result}" alt="미리보기" style="max-width: 100%; max-height: 250px; border-radius: 8px; margin-bottom: 12px; object-fit: contain;">
            <button type="button" class="remove-image-btn" style="padding: 8px 16px; background: #e53935; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">이미지 제거</button>
          `;
          
          // 이미지 제거 버튼 이벤트
          const removeBtn = imagePreview.querySelector('.remove-image-btn');
          if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              e.preventDefault();
              imageInput.value = '';
              // 원래 스타일로 복원
              imagePreview.style.display = 'flex';
              imagePreview.style.flexDirection = 'row';
              imagePreview.style.alignItems = 'center';
              imagePreview.style.justifyContent = 'center';
              imagePreview.style.padding = '0';
              imagePreview.innerHTML = '📷 클릭하여 작품 사진을 올려주세요';
            });
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // 초기 버튼 상태 설정
  updateSubmitButton();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = titleInput.value.trim();
    const contents = contentInput.value.trim();
    const images = imageInput?.files;

    // 제목과 내용 검증
    if (!title || !contents) {
      if (titleError) {
        titleError.textContent = '* 제목, 내용을 모두 입력해주세요.';
        titleError.style.display = 'block';
      }
      return;
    }
    
    if (titleError) titleError.style.display = 'none';
    if (contentError) contentError.style.display = 'none';

    // 제출 버튼 비활성화 (중복 제출 방지)
    submitBtn.disabled = true;
    submitBtn.textContent = '등록 중...';

    try {
      console.log('게시글 작성 시도:', { title, contents, hasImage: images && images.length > 0 });
      
      // 사용자가 제공한 API 형식에 맞춰 JSON으로 전송
      const payload = {
        title,
        contents
      };
      
      // 이미지가 있는 경우 경고만 표시 (현재 백엔드 API가 이미지를 지원하지 않을 수 있음)
      if (images && images.length > 0) {
        console.warn('이미지 업로드는 현재 JSON API에서 지원하지 않을 수 있습니다.');
      }
      
      console.log('전송할 데이터:', payload);
      
      // 토큰 갱신 후 API 재시도 헬퍼 함수
      async function createPostWithTokenRefresh() {
        try {
          return await axios.post('/boards', payload, {
            headers: {
              'Content-Type': 'application/json'
            },
            withCredentials: true
          });
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
                return await axios.post('/boards', payload, {
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  withCredentials: true
                });
              } catch (refreshError) {
                console.error('토큰 갱신 실패:', refreshError);
                // 갱신 실패 시 로그인 페이지로 이동
                alert('세션이 만료되었습니다. 다시 로그인해주세요.');
                window.location.href = '/login';
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
      
      const response = await createPostWithTokenRefresh();

      console.log('게시글 작성 성공:', response.data);

      // 등록 완료 UI
      if (toast) {
        toast.textContent = '등록 완료';
        toast.style.display = 'block';
        setTimeout(() => {
          toast.style.display = 'none';
          window.location.href = '/post-list';
        }, 1000);
      } else {
        // toast가 없으면 바로 이동
        window.location.href = '/post-list';
      }
    } catch (error) {
      console.error('게시글 등록 실패:', error);
      
      // 제출 버튼 다시 활성화
      submitBtn.disabled = false;
      submitBtn.textContent = '등록';
      
      let errorMessage = '게시글 등록 중 오류가 발생했습니다.';
      
      if (error.response) {
        // 서버 응답이 있는 경우
        const errorData = error.response.data;
        if (errorData && errorData.message) {
          errorMessage = errorData.message;
        } else if (error.response.status === 500) {
          errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        } else if (error.response.status === 401) {
          errorMessage = '로그인이 필요합니다.';
        } else if (error.response.status === 403) {
          errorMessage = '권한이 없습니다.';
        }
      } else if (error.request) {
        errorMessage = '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.';
      }
      
      if (contentError) {
        contentError.textContent = `* ${errorMessage}`;
        contentError.style.display = 'block';
      } else {
        alert(errorMessage);
      }
    }
  });
});
