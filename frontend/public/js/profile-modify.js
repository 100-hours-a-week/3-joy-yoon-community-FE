document.addEventListener('DOMContentLoaded', async () => {
  const profilePreview = document.getElementById('profilePreview');
  const profileImageInput = document.getElementById('profileImage');
  const userEmail = document.getElementById('userEmail');
  const nicknameInput = document.getElementById('nickname');
  const nicknameError = document.getElementById('nicknameError');
  const updateBtn = document.getElementById('updateBtn');
  const withdrawBtn = document.getElementById('withdrawBtn');
  const modal = document.getElementById('withdrawModal');
  const confirmWithdraw = document.getElementById('confirmWithdraw');
  const cancelWithdraw = document.getElementById('cancelWithdraw');
  const toast = document.getElementById('toastMsg');
  const successModal = document.getElementById('successModal');
  const confirmSuccess = document.getElementById('confirmSuccess');

  let currentUserId = null;
  let currentUserData = null;
  let base64Image = null;
  let imageRemoved = false;
  let hadInitialImage = false; // 초기에 이미지가 있었는지 추적

  // 현재 사용자 정보 로드
  async function loadUserInfo() {
    try {
      const response = await axios.get('/auth/me', {
        withCredentials: true
      });
      
      if (response.data && response.data.isLoggedIn) {
        currentUserId = response.data.userId;
        currentUserData = response.data;
        
        // 이메일 표시
        if (userEmail) {
          userEmail.textContent = response.data.email || '';
        }
        
        // 닉네임 표시
        if (nicknameInput) {
          nicknameInput.value = response.data.nickname || '';
        }
        
        // 프로필 이미지 표시
        // profileImage가 null이거나 undefined이거나 빈 문자열이면 이미지 없음으로 처리
        const profileImage = response.data.profileImage;
        if (profilePreview) {
          // 유효한 이미지인지 엄격하게 체크
          const isValidImage = profileImage && 
            profileImage !== null && 
            profileImage !== 'null' && 
            profileImage !== '' && 
            profileImage !== undefined &&
            typeof profileImage === 'string' &&
            profileImage.trim() !== '' &&
            (profileImage.startsWith('data:image/') || 
             profileImage.startsWith('http://') || 
             profileImage.startsWith('https://') ||
             profileImage.startsWith('/'));
          
          if (isValidImage) {
            profilePreview.innerHTML = `<img src="${profileImage}" alt="프로필">`;
            profilePreview.style.backgroundImage = `url(${profileImage})`;
            hadInitialImage = true; // 초기에 이미지가 있었음
            console.log('프로필 이미지 로드:', profileImage.substring(0, 50) + '...');
          } else {
            profilePreview.innerHTML = '<span class="plus-icon">+</span>';
            profilePreview.style.backgroundImage = '';
            hadInitialImage = false; // 초기에 이미지가 없었음
            console.log('프로필 이미지 없음 (null, 빈 값, 또는 유효하지 않은 형식):', {
              profileImage: profileImage,
              type: typeof profileImage,
              isNull: profileImage === null,
              isEmpty: profileImage === '',
              isUndefined: profileImage === undefined
            });
          }
        }
      } else {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error);
      alert('사용자 정보를 불러올 수 없습니다.');
      window.location.href = '/login';
    }
  }

  // 이미지 압축 함수
  function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 비율 유지하면서 크기 조정
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // 압축된 이미지를 base64로 변환
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = event.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // 프로필 이미지 변경 확인 모달
  const imageChangeModal = document.createElement('div');
  imageChangeModal.className = 'modal-overlay';
  imageChangeModal.id = 'imageChangeModal';
  imageChangeModal.style.display = 'none';
  imageChangeModal.innerHTML = `
    <div class="modal">
      <div class="modal-content">
        <h3 class="modal-title">프로필 사진 변경</h3>
        <p class="modal-message">프로필 사진을 변경하시겠습니까?</p>
        <div class="modal-actions">
          <button id="cancelImageChange" class="cancel">취소</button>
          <button id="confirmImageChange" class="confirm">확인</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(imageChangeModal);

  // 프로필 이미지 삭제 확인 모달
  const imageDeleteModal = document.createElement('div');
  imageDeleteModal.className = 'modal-overlay';
  imageDeleteModal.id = 'imageDeleteModal';
  imageDeleteModal.style.display = 'none';
  imageDeleteModal.innerHTML = `
    <div class="modal">
      <div class="modal-content">
        <h3 class="modal-title">프로필 사진 삭제</h3>
        <p class="modal-message">프로필 사진을 삭제하시겠습니까?<br>삭제한 사진은 복구할 수 없습니다.</p>
        <div class="modal-actions">
          <button id="cancelImageDelete" class="cancel">취소</button>
          <button id="confirmImageDelete" class="confirm">삭제</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(imageDeleteModal);

  const cancelImageChange = document.getElementById('cancelImageChange');
  const confirmImageChange = document.getElementById('confirmImageChange');
  const cancelImageDelete = document.getElementById('cancelImageDelete');
  const confirmImageDelete = document.getElementById('confirmImageDelete');

  // 프로필 이미지 클릭 시 모달 표시
  if (profilePreview && profileImageInput) {
    profilePreview.addEventListener('click', () => {
      // 프로필 이미지가 있으면 모달 표시, 없으면 바로 파일 선택
      if (currentUserData?.profileImage || base64Image) {
        imageChangeModal.style.display = 'flex';
      } else {
        profileImageInput.click();
      }
    });

    // 모달 취소 버튼
    if (cancelImageChange) {
      cancelImageChange.addEventListener('click', () => {
        imageChangeModal.style.display = 'none';
      });
    }

    // 모달 확인 버튼 - 파일 선택
    if (confirmImageChange) {
      confirmImageChange.addEventListener('click', () => {
        imageChangeModal.style.display = 'none';
        profileImageInput.click();
      });
    }

        // 프로필 이미지 변경
        profileImageInput.addEventListener('change', async (e) => {
          const file = e.target.files[0];
          if (!file) return;

          if (file.size > 5 * 1024 * 1024) {
            alert('이미지 크기는 5MB 이하로 제한됩니다.');
            profileImageInput.value = '';
            return;
          }

          try {
            // 이미지 압축
            const compressedImage = await compressImage(file, 800, 800, 0.8);
            
            profilePreview.innerHTML = `<img src="${compressedImage}" alt="프로필">`;
            profilePreview.style.backgroundImage = `url(${compressedImage})`;
            base64Image = compressedImage;
            imageRemoved = false; // 새 이미지가 있으면 삭제 플래그 해제
            
            console.log('프로필 이미지 압축 완료');
            
            // 프로필 이미지가 변경되었으므로 버튼 활성화
            updateButtonState();
          } catch (error) {
            console.error('이미지 압축 실패:', error);
            alert('이미지 처리 중 오류가 발생했습니다.');
            profileImageInput.value = '';
          }
        });

    // 프로필 이미지 삭제 (우클릭) - modal 표시
    profilePreview.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      // 프로필 이미지가 있을 때만 삭제 모달 표시
      if (currentUserData?.profileImage || base64Image) {
        imageDeleteModal.style.display = 'flex';
      }
    });

    // 이미지 삭제 모달 취소 버튼
    if (cancelImageDelete) {
      cancelImageDelete.addEventListener('click', () => {
        imageDeleteModal.style.display = 'none';
      });
    }

    // 이미지 삭제 모달 확인 버튼
    if (confirmImageDelete) {
      confirmImageDelete.addEventListener('click', () => {
        // 이미지 삭제 처리
        profilePreview.innerHTML = '<span class="plus-icon">+</span>';
        profilePreview.style.backgroundImage = '';
        profileImageInput.value = '';
        base64Image = null;
        imageRemoved = true;
        
        // 모달 닫기
        imageDeleteModal.style.display = 'none';
        
        // 이미지가 삭제되었으므로 버튼 활성화
        updateButtonState();
      });
    }

    // 이미지 삭제 모달 배경 클릭 시 닫기
    imageDeleteModal.addEventListener('click', (e) => {
      if (e.target === imageDeleteModal) {
        imageDeleteModal.style.display = 'none';
      }
    });

    // 이미지 변경 모달 배경 클릭 시 닫기
    imageChangeModal.addEventListener('click', (e) => {
      if (e.target === imageChangeModal) {
        imageChangeModal.style.display = 'none';
      }
    });
  }

  // 버튼 활성화 상태 업데이트 함수
  function updateButtonState() {
    if (!updateBtn) return;
    
    const nickname = nicknameInput?.value.trim() || '';
    const hasNicknameChange = nickname && nickname !== currentUserData?.nickname;
    const hasImageChange = base64Image !== null || (imageRemoved && hadInitialImage);
    const hasValidNickname = nickname && !/\s/.test(nickname) && nickname.length >= 2 && nickname.length <= 10;
    
    // 프로필 이미지가 변경되었거나, 닉네임이 유효하고 변경되었으면 버튼 활성화
    const shouldEnable = hasImageChange || (hasValidNickname && hasNicknameChange);
    
    if (shouldEnable) {
      updateBtn.disabled = false;
      updateBtn.classList.add('active');
    } else {
      // 변경사항이 없으면 비활성화
      updateBtn.disabled = true;
      updateBtn.classList.remove('active');
    }
  }

  // 닉네임 유효성 검사
  if (nicknameInput) {
  nicknameInput.addEventListener('input', () => {
    const value = nicknameInput.value.trim();
    let message = '';

      if (!value) {
        message = '* 닉네임을 입력해주세요.';
      } else if (/\s/.test(value)) {
        message = '* 띄어쓰기를 없애주세요.';
      } else if (value.length < 2) {
        message = '* 닉네임은 최소 2자 이상이어야 합니다.';
      } else if (value.length > 10) {
        message = '* 닉네임은 최대 10자까지 작성 가능합니다.';
      }

    if (message) {
        if (nicknameError) {
      nicknameError.textContent = message;
      nicknameError.style.display = 'block';
        }
    } else {
        if (nicknameError) {
      nicknameError.style.display = 'none';
        }
      }
      
      // 버튼 상태 업데이트
      updateButtonState();
    });
  }

  // 수정 버튼 클릭
  if (updateBtn) {
    updateBtn.addEventListener('click', async () => {
      if (!currentUserId) {
        alert('사용자 정보를 불러올 수 없습니다.');
        return;
      }

      const nickname = nicknameInput?.value.trim() || '';
      
      if (!nickname) {
        if (nicknameError) {
      nicknameError.textContent = '* 닉네임을 입력해주세요.';
      nicknameError.style.display = 'block';
        }
        return;
      }

      // 변경사항이 없으면 알림
      if (nickname === currentUserData?.nickname && !base64Image && !imageRemoved) {
        alert('변경된 내용이 없습니다.');
      return;
    }

      updateBtn.disabled = true;
      updateBtn.textContent = '수정 중...';

      try {
        const payload = {
          nickname: nickname
        };

        // 이미지 처리: 새 이미지가 있으면 업데이트, 삭제 요청이면 빈 문자열, 둘 다 아니면 전송 안 함
        if (base64Image) {
          // 새 이미지 업로드
          payload.image = base64Image; // 백엔드 users.image 필드에 저장
        } else if (imageRemoved || (hadInitialImage && !base64Image)) {
          // 이미지 삭제 요청 (우클릭으로 삭제했거나, 원래 이미지가 있었는데 현재 없으면)
          payload.image = ""; // 빈 문자열로 삭제 요청
        }

        console.log('=== 회원정보 수정 요청 ===');
        console.log('userId:', currentUserId);
        console.log('nickname:', nickname);
        console.log('hasImage:', !!base64Image);
        console.log('imageRemoved:', imageRemoved);
        console.log('payload:', payload);

        const response = await axios.put('/auth/update', payload, {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true
        });

        console.log('=== 회원정보 수정 성공 ===');
        console.log('응답 상태:', response.status);
        console.log('응답 데이터:', response.data);

        // 성공 modal 표시
        if (successModal) {
          successModal.style.display = 'flex';
        } else {
          // modal이 없으면 toast 사용 (fallback)
          if (toast) {
    toast.textContent = '수정 완료';
    toast.style.display = 'block';
            setTimeout(() => {
              toast.style.display = 'none';
              window.location.reload();
            }, 1500);
          } else {
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        }
      } catch (error) {
        console.error('회원정보 수정 실패:', error);
        updateBtn.disabled = false;
        updateBtn.textContent = '수정하기';

        let errorMessage = '회원정보 수정에 실패했습니다.';
        if (error.response) {
          errorMessage = error.response.data?.message || errorMessage;
          console.error('에러 응답:', error.response.status, error.response.data);
        } else if (error.request) {
          errorMessage = '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.';
        }

        alert(errorMessage);
      }
    });
  }

  // 성공 modal 확인 버튼 클릭 시
  if (confirmSuccess) {
    confirmSuccess.addEventListener('click', async () => {
      if (successModal) {
        successModal.style.display = 'none';
      }
      // 최신 사용자 정보를 다시 로드하여 세션 업데이트 확인
      try {
        await loadUserInfo();
        // 페이지 새로고침하여 변경사항 반영
        window.location.reload();
      } catch (error) {
        console.error('사용자 정보 재로드 실패:', error);
        // 실패해도 새로고침
        window.location.reload();
      }
    });
  }

  // 성공 modal 배경 클릭 시
  if (successModal) {
    successModal.addEventListener('click', async (e) => {
      if (e.target === successModal) {
        successModal.style.display = 'none';
        // 최신 사용자 정보를 다시 로드하여 세션 업데이트 확인
        try {
          await loadUserInfo();
          // 페이지 새로고침하여 변경사항 반영
          window.location.reload();
        } catch (error) {
          console.error('사용자 정보 재로드 실패:', error);
          // 실패해도 새로고침
          window.location.reload();
        }
      }
    });
  }

  // 회원탈퇴 모달
  if (withdrawBtn && modal && confirmWithdraw && cancelWithdraw) {
    withdrawBtn.addEventListener('click', () => {
      modal.style.display = 'flex';
    });
    
    cancelWithdraw.addEventListener('click', () => {
      modal.style.display = 'none';
    });
    
  confirmWithdraw.addEventListener('click', () => {
    modal.style.display = 'none';
    alert('회원 탈퇴가 완료되었습니다.');
    window.location.href = '/login';
  });
  }

  // 초기 사용자 정보 로드
  await loadUserInfo();
});
