document.addEventListener('DOMContentLoaded', () => {
  // Express 서버의 /boards 엔드포인트 사용 (세션을 통한 인증 처리)
  const POSTS_API_URL = '/boards';
  
  // URL에서 게시글 ID 가져오기
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');

  if (!postId) {
    alert('게시글을 찾을 수 없습니다.');
    window.location.href = '/post-list';
    return;
  }

  // DOM 요소
  const btnBack = document.getElementById('btnBack');
  const btnEdit = document.getElementById('btnEdit');
  const btnDelete = document.getElementById('btnDelete');
  const btnLike = document.getElementById('btnLike');
  const likeCount = document.getElementById('likeCount');
  const viewCount = document.getElementById('viewCount');
  const commentCount = document.getElementById('commentCount');
  const commentInput = document.getElementById('commentInput');
  const btnCommentSubmit = document.getElementById('btnCommentSubmit');
  const commentBtnText = document.getElementById('commentBtnText');
  const commentList = document.getElementById('commentList');
  const modalOverlay = document.getElementById('modalOverlay');
  const btnModalCancel = document.getElementById('btnModalCancel');
  const btnModalConfirm = document.getElementById('btnModalConfirm');
  const modalTitle = document.getElementById('modalTitle');
  const modalMessage = document.getElementById('modalMessage');

  // 필수 요소가 없으면 에러 로그 출력
  if (!btnBack || !btnLike || !commentInput || !btnCommentSubmit || !commentList || !modalOverlay) {
    console.error('필수 DOM 요소를 찾을 수 없습니다.');
  }

  let currentPost = null;
  let isLiked = false;
  let editingCommentId = null;
  let deleteTarget = null; // 'post' 또는 'comment'
  let deleteCommentId = null;
  let editTarget = null; // 'post' for post edit
  let tokenExpired = false; // 토큰 만료 플래그
  let currentUserId = null; // 현재 로그인한 사용자 ID
  let currentUserNickname = null; // 현재 로그인한 사용자 닉네임

  // 숫자 포맷팅 (1k, 10k, 100k)
  function formatNumber(num) {
    if (num >= 100000) return Math.floor(num / 1000) + 'k';
    if (num >= 10000) return Math.floor(num / 1000) + 'k';
    if (num >= 1000) return Math.floor(num / 1000) + 'k';
    return num.toString();
  }

  // 날짜 포맷팅
  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  // 현재 사용자 정보 가져오기
  async function loadCurrentUser() {
    try {
      const response = await axios.get('/auth/me', {
        withCredentials: true
      });
      console.log('=== 사용자 정보 응답 ===');
      console.log(JSON.stringify(response.data, null, 2));
      
      if (response.data && response.data.isLoggedIn) {
        currentUserId = response.data.userId;
        currentUserNickname = response.data.nickname;
        console.log('현재 사용자 정보 로드 성공:', {
          userId: currentUserId,
          nickname: currentUserNickname
        });
      } else {
        console.log('로그인되지 않음');
        currentUserId = null;
        currentUserNickname = null;
      }
    } catch (error) {
      console.error('사용자 정보 로드 실패:', error);
      currentUserId = null;
    }
  }

  // 게시글 조회
  async function loadPost() {
    try {
      const response = await axios.get(`${POSTS_API_URL}/${postId}`, {
        withCredentials: true // 쿠키(세션) 전송을 위해 필요
      });
      
      const post = response.data;
      currentPost = post;
      
      // 디버깅: 게시글 전체 데이터 출력
      console.log('=== 게시글 데이터 전체 ===');
      console.log(JSON.stringify(post, null, 2));
      console.log('게시글의 모든 키:', Object.keys(post));
      console.log('현재 사용자 ID:', currentUserId, typeof currentUserId);
      
      // 모든 가능한 작성자 ID 필드 확인
      const possibleAuthorIds = {
        userId: post.userId,
        authorId: post.authorId,
        writerId: post.writerId,
        authorUserId: post.authorUserId,
        userUserId: post.user?.userId,
        userId: post.user?.id,
        author: post.author,
        writer: post.writer,
        createdBy: post.createdBy,
        ownerId: post.ownerId
      };
      console.log('가능한 작성자 ID 필드들:', possibleAuthorIds);
      
      displayPost(post);
      
      // 좋아요 상태 초기화 (백엔드에서 좋아요 상태를 제공하도록 변경됨)
      // 모든 가능한 좋아요 상태 필드 확인
      const possibleLikeFields = {
        isLiked: post.isLiked,
        liked: post.liked,
        userLiked: post.userLiked,
        hasLiked: post.hasLiked,
        isUserLiked: post.isUserLiked,
        userHasLiked: post.userHasLiked,
        likedByUser: post.likedByUser,
        userHasLikedPost: post.userHasLikedPost
      };
      console.log('=== 좋아요 상태 필드 확인 ===');
      console.log('가능한 좋아요 상태 필드들:', possibleLikeFields);
      console.log('게시글 전체 키:', Object.keys(post));
      
      // 좋아요 상태 확인 (우선순위 순서대로)
      // 백엔드가 변경되어 좋아요 상태를 제공하므로, 다양한 필드명을 확인
      // isLiked 필드를 최우선으로 확인 (백엔드에서 제공하는 경우)
      if (post.isLiked !== undefined && post.isLiked !== null) {
        // 문자열 "true"/"false" 또는 불리언 모두 처리
        if (typeof post.isLiked === 'string') {
          isLiked = post.isLiked.toLowerCase() === 'true';
        } else {
          isLiked = Boolean(post.isLiked);
        }
        console.log('isLiked 필드에서 좋아요 상태 확인:', isLiked, '(원본 값:', post.isLiked, ')');
      } else if (post.liked !== undefined && post.liked !== null) {
        isLiked = Boolean(post.liked);
        console.log('liked 필드에서 좋아요 상태 확인:', isLiked);
      } else if (post.userLiked !== undefined && post.userLiked !== null) {
        isLiked = Boolean(post.userLiked);
        console.log('userLiked 필드에서 좋아요 상태 확인:', isLiked);
      } else if (post.hasLiked !== undefined && post.hasLiked !== null) {
        isLiked = Boolean(post.hasLiked);
        console.log('hasLiked 필드에서 좋아요 상태 확인:', isLiked);
      } else if (post.isUserLiked !== undefined && post.isUserLiked !== null) {
        isLiked = Boolean(post.isUserLiked);
        console.log('isUserLiked 필드에서 좋아요 상태 확인:', isLiked);
      } else if (post.userHasLiked !== undefined && post.userHasLiked !== null) {
        isLiked = Boolean(post.userHasLiked);
        console.log('userHasLiked 필드에서 좋아요 상태 확인:', isLiked);
      } else if (post.likedByUser !== undefined && post.likedByUser !== null) {
        isLiked = Boolean(post.likedByUser);
        console.log('likedByUser 필드에서 좋아요 상태 확인:', isLiked);
      } else if (post.userHasLikedPost !== undefined && post.userHasLikedPost !== null) {
        isLiked = Boolean(post.userHasLikedPost);
        console.log('userHasLikedPost 필드에서 좋아요 상태 확인:', isLiked);
      } else {
        // 백엔드에서 좋아요 상태를 제공하지 않는 경우, 기본값은 false
        isLiked = false;
        console.warn('좋아요 상태 정보를 찾을 수 없습니다. 기본값 false로 설정합니다.');
        console.warn('게시글 데이터의 모든 키:', Object.keys(post));
      }
      
      console.log('=== 좋아요 상태 최종 결정 ===');
      console.log('최종 isLiked 값:', isLiked);
      console.log('현재 사용자 ID:', currentUserId);
      console.log('게시글 ID:', post.postId || post.id);
      
      // 좋아요 버튼 상태 업데이트 (강제로 업데이트)
      // isLiked가 true이면 주황색으로 표시
      updateLikeButtonState(isLiked);
      
      // 추가 확인: 버튼 상태가 제대로 적용되었는지 확인
      setTimeout(() => {
        if (btnLike) {
          const hasActive = btnLike.classList.contains('active');
          console.log('좋아요 버튼 상태 확인:', {
            isLiked: isLiked,
            hasActiveClass: hasActive,
            expectedColor: isLiked ? '주황색' : '하얀색'
          });
        }
      }, 100);
      
      loadComments();
    } catch (error) {
      console.error('게시글 로드 실패:', error);
      const errorMessage = error.response?.data?.message || error.message || '게시글을 불러오는데 실패했습니다.';
      alert(errorMessage);
    }
  }

  // 좋아요 버튼 상태 업데이트 함수
  function updateLikeButtonState(liked) {
    if (!btnLike) {
      console.warn('좋아요 버튼 요소를 찾을 수 없습니다.');
      return;
    }
    
    const likeIcon = btnLike.querySelector('.like-icon');
    
    if (liked) {
      // 좋아요를 누른 상태: 주황색 (active 클래스 추가)
      btnLike.classList.add('active');
      if (likeIcon) likeIcon.textContent = '🧡'; // 주황색 하트
      console.log('좋아요 버튼: 주황색 (좋아요 누름)');
    } else {
      // 좋아요를 누르지 않은 상태: 하얀색 (active 클래스 제거)
      btnLike.classList.remove('active');
      if (likeIcon) likeIcon.textContent = '🤍'; // 흰색 하트
      console.log('좋아요 버튼: 하얀색 (좋아요 안 누름)');
    }
  }

  // 게시글 표시
  function displayPost(post) {
    const postTitleEl = document.getElementById('postTitle');
    const postAuthorEl = document.getElementById('postAuthor');
    const postDateEl = document.getElementById('postDate');
    const postCommentsEl = document.getElementById('postComments');
    const postBodyEl = document.getElementById('postBody');
    const viewCountEl = document.getElementById('viewCount') || document.getElementById('postViews');
    const likeCountEl = document.getElementById('likeCount');
    const commentCountEl = document.getElementById('commentCount');
    const postImageEl = document.getElementById('postImage');
    const postActionsEl = document.getElementById('postActions');

    // 프로필 이미지 HTML 생성 함수
    function createProfileImageHtml(authorName, profileImage) {
      if (profileImage) {
        return `<img src="${profileImage}" alt="${authorName}" class="author-avatar-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
      }
      return '';
    }

    // 기본 아바타 HTML 생성 함수
    function createDefaultAvatarHtml(authorName) {
      const initial = (authorName || 'U').charAt(0).toUpperCase();
      return `<span class="author-avatar-initial">${initial}</span>`;
    }

    // 작성자 정보 가져오기 (백엔드 users.image 필드도 지원)
    const authorName = post.author || post.authorNickname || post.nickname || '익명';
    
    // 프로필 이미지 찾기 (다양한 경로 탐색)
    // 빈 문자열, null, 'null', undefined는 제외
    let authorProfileImage = null;
    
    // 유효한 이미지 값인지 확인하는 헬퍼 함수
    const isValidImage = (img) => {
      return img && img !== null && img !== 'null' && img !== '' && img !== undefined && img.trim() !== '';
    };
    
    // 직접 필드 확인
    if (isValidImage(post.authorProfileImage)) authorProfileImage = post.authorProfileImage;
    else if (isValidImage(post.profileImage)) authorProfileImage = post.profileImage;
    else if (isValidImage(post.image)) authorProfileImage = post.image;
    else if (isValidImage(post.authorImage)) authorProfileImage = post.authorImage;
    
    // user 객체 내부 확인
    if (!authorProfileImage && post.user) {
      if (isValidImage(post.user.image)) authorProfileImage = post.user.image;
      else if (isValidImage(post.user.profileImage)) authorProfileImage = post.user.profileImage;
      else if (isValidImage(post.user.authorImage)) authorProfileImage = post.user.authorImage;
    }
    
    // author 객체 내부 확인
    if (!authorProfileImage && post.authorObj) {
      if (isValidImage(post.authorObj.image)) authorProfileImage = post.authorObj.image;
      else if (isValidImage(post.authorObj.profileImage)) authorProfileImage = post.authorObj.profileImage;
    }
    
    // 디버깅: 프로필 이미지 찾기 실패 시 로그
    if (!authorProfileImage) {
      console.log('게시글 상세 - 프로필 이미지를 찾을 수 없습니다:', {
        postId: post.postId || post.id,
        author: authorName,
        hasUser: !!post.user,
        hasAuthorObj: !!post.authorObj,
        userKeys: post.user ? Object.keys(post.user) : [],
        authorObjKeys: post.authorObj ? Object.keys(post.authorObj) : [],
        allKeys: Object.keys(post).filter(key => key.toLowerCase().includes('image') || key.toLowerCase().includes('user') || key.toLowerCase().includes('author'))
      });
    }

    if (postTitleEl) postTitleEl.textContent = post.title || '';
    
    // 작성자 정보 표시 (프로필 이미지 포함)
    if (postAuthorEl) {
      const profileImageHtml = createProfileImageHtml(authorName, authorProfileImage);
      const defaultAvatarHtml = createDefaultAvatarHtml(authorName);
      postAuthorEl.innerHTML = `
        <div class="post-author-info">
          <div class="author-avatar">
            ${profileImageHtml}
            ${defaultAvatarHtml}
          </div>
          <span class="author-name">${authorName}</span>
        </div>
      `;
    }
    
    if (postDateEl) postDateEl.textContent = formatDate(post.createdAt);
    if (postCommentsEl) postCommentsEl.textContent = formatNumber(post.commentCount || 0);
    if (postBodyEl) postBodyEl.textContent = post.contents || '';
    if (viewCountEl) viewCountEl.textContent = formatNumber(post.viewCount || post.views || 0);
    if (likeCountEl) likeCountEl.textContent = formatNumber(post.likeCount || post.likes || 0);
    if (commentCountEl) commentCountEl.textContent = formatNumber(post.commentCount || 0);

    // 이미지 표시 (다양한 필드명 지원: imageUrls, imageUrl, image, images 등)
    if (postImageEl) {
      // 가능한 모든 이미지 필드 확인
      let imageUrls = post.imageUrls || post.imageUrl || post.image || post.images;
      
      // image 필드가 배열이 아닌 단일 문자열인 경우도 처리
      if (!imageUrls && post.image && typeof post.image === 'string') {
        imageUrls = post.image;
      }
      
      console.log('게시글 이미지 필드 확인:', {
        imageUrls: post.imageUrls,
        imageUrl: post.imageUrl,
        image: post.image,
        images: post.images,
        최종사용값: imageUrls,
        타입: typeof imageUrls,
        배열여부: Array.isArray(imageUrls)
      });
      
      if (imageUrls) {
        // 배열인 경우
        if (Array.isArray(imageUrls) && imageUrls.length > 0) {
          const imagesHtml = imageUrls.map(url => {
            // base64 이미지인지 URL인지 확인
            const imageSrc = url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://') 
              ? url 
              : (url.startsWith('/') ? url : `/${url}`);
            return `<img src="${imageSrc}" alt="게시글 이미지" style="max-width: 100%; margin-bottom: 10px; border-radius: 8px; display: block;" onerror="console.error('이미지 로드 실패:', this.src); this.style.display='none';">`;
          }).join('');
          postImageEl.innerHTML = imagesHtml;
          console.log('게시글 이미지 표시 완료 (배열):', imageUrls.length, '개');
        } 
        // 문자열인 경우
        else if (typeof imageUrls === 'string' && imageUrls.trim() !== '') {
          // base64 이미지인지 URL인지 확인
          const imageSrc = imageUrls.startsWith('data:') || imageUrls.startsWith('http://') || imageUrls.startsWith('https://') 
            ? imageUrls 
            : (imageUrls.startsWith('/') ? imageUrls : `/${imageUrls}`);
          postImageEl.innerHTML = `<img src="${imageSrc}" alt="게시글 이미지" style="max-width: 100%; border-radius: 8px; display: block;" onerror="console.error('이미지 로드 실패:', this.src); this.style.display='none';">`;
          console.log('게시글 이미지 표시 완료 (문자열)');
        } else {
          postImageEl.innerHTML = '';
          console.log('게시글 이미지 없음 (빈 값)');
        }
      } else {
        postImageEl.innerHTML = '';
        console.log('게시글 이미지 필드를 찾을 수 없음');
      }
    }

    // 게시글 작성자 ID 찾기 (재귀적으로 모든 필드 검색)
    function findAuthorId(obj, depth = 0, path = '') {
      if (depth > 3 || !obj || typeof obj !== 'object') return null;
      
      // 직접 필드 확인 (우선순위 높은 필드들)
      const priorityFields = ['userId', 'authorId', 'writerId', 'authorUserId', 'createdBy', 'ownerId'];
      for (const field of priorityFields) {
        if (obj[field] !== undefined && obj[field] !== null) {
          const value = obj[field];
          // 숫자나 문자열 숫자인 경우
          if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))) {
            console.log(`작성자 ID 발견: ${path}${field} = ${value}`);
            return value;
          }
        }
      }
      
      // user 객체 내부 확인
      if (obj.user && typeof obj.user === 'object') {
        const userAuthorId = findAuthorId(obj.user, depth + 1, path + 'user.');
        if (userAuthorId) return userAuthorId;
      }
      
      // author 객체 내부 확인
      if (obj.author && typeof obj.author === 'object') {
        const authorId = findAuthorId(obj.author, depth + 1, path + 'author.');
        if (authorId) return authorId;
      }
      
      // 모든 숫자 필드 찾기 (id 필드 제외 - 너무 일반적)
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          // 숫자 필드 중 id 관련 필드 찾기
          if ((key.toLowerCase().includes('user') || key.toLowerCase().includes('author') || key.toLowerCase().includes('writer')) 
              && (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value)))) {
            console.log(`작성자 ID 발견: ${path}${key} = ${value}`);
            return value;
          }
          
          // 객체인 경우 재귀 검색
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const found = findAuthorId(value, depth + 1, path + key + '.');
            if (found) return found;
          }
        }
      }
      
      return null;
    }
    
    const postAuthorId = findAuthorId(post);
    
    // 찾지 못한 경우 모든 숫자 필드 출력
    if (!postAuthorId) {
      console.warn('작성자 ID를 찾을 수 없습니다. 게시글의 모든 숫자 필드:');
      function findAllNumbers(obj, path = '') {
        const numbers = [];
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            if (typeof value === 'number') {
              numbers.push(`${path}${key} = ${value}`);
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              numbers.push(...findAllNumbers(value, path + key + '.'));
            }
          }
        }
        return numbers;
      }
      const allNumbers = findAllNumbers(post);
      console.log(allNumbers);
    }
    
    // 현재 사용자가 게시글 작성자인지 확인 (userId로만 비교)
    const currentUserIdStr = currentUserId ? String(currentUserId) : null;
    const postAuthorIdStr = postAuthorId ? String(postAuthorId) : null;
    
    // userId로만 비교 (닉네임 비교 제거)
    const isPostAuthor = currentUserIdStr && postAuthorIdStr && currentUserIdStr === postAuthorIdStr;
    
    console.log('=== 작성자 확인 (userId로만 비교) ===');
    console.log('현재 사용자 userId:', currentUserId, '→ 문자열:', currentUserIdStr);
    console.log('게시글 작성자 userId:', postAuthorId, '→ 문자열:', postAuthorIdStr);
    console.log('작성자 일치 여부:', isPostAuthor);
    
    if (!postAuthorId) {
      console.warn('게시글 작성자 userId를 찾을 수 없습니다. 백엔드 API가 작성자 userId를 반환해야 합니다.');
    }
    
    // 수정/삭제 버튼 표시 (모두에게 보이게)
    if (postActionsEl) {
      postActionsEl.innerHTML = `
        <button class="btn-edit" id="btnEdit">수정</button>
        <button class="btn-delete" id="btnDelete">삭제</button>
      `;
      
      // 이벤트 리스너 등록
      const btnEdit = document.getElementById('btnEdit');
      const btnDelete = document.getElementById('btnDelete');
      
      if (btnEdit) {
        btnEdit.addEventListener('click', () => {
          // 로그인 확인
          if (!currentUserId) {
            editTarget = 'login'; // 로그인 필요 표시
            if (modalTitle) modalTitle.textContent = '로그인이 필요합니다.';
            if (modalMessage) modalMessage.textContent = '로그인 페이지로 이동합니다.';
            if (modalOverlay) modalOverlay.classList.add('active');
            return;
          }
          
          // userId 확인
          if (!postAuthorId) {
            if (modalTitle) modalTitle.textContent = '권한이 없습니다.';
            if (modalMessage) modalMessage.textContent = '본인이 쓴 글만 수정, 삭제할 수 있습니다.';
            if (modalOverlay) modalOverlay.classList.add('active');
            return;
          }
          
          const currentUserIdStr = String(currentUserId);
          const postAuthorIdStr = String(postAuthorId);
          
          if (currentUserIdStr === postAuthorIdStr) {
            // 작성자인 경우 - 모달 표시
            editTarget = 'post';
            if (modalTitle) modalTitle.textContent = '게시글을 수정하시겠습니까?';
            if (modalMessage) modalMessage.textContent = '수정 페이지로 이동합니다.';
            if (modalOverlay) modalOverlay.classList.add('active');
          } else {
            // 작성자가 아닌 경우 - 모달로 표시
            if (modalTitle) modalTitle.textContent = '권한이 없습니다.';
            if (modalMessage) modalMessage.textContent = '본인이 쓴 글만 수정, 삭제할 수 있습니다.';
            if (modalOverlay) modalOverlay.classList.add('active');
          }
        });
      }
      
      if (btnDelete) {
        btnDelete.addEventListener('click', () => {
          // 로그인 확인
          if (!currentUserId) {
            deleteTarget = 'login'; // 로그인 필요 표시
            if (modalTitle) modalTitle.textContent = '로그인이 필요합니다.';
            if (modalMessage) modalMessage.textContent = '로그인 페이지로 이동합니다.';
            if (modalOverlay) modalOverlay.classList.add('active');
            return;
          }
          
          // userId 확인
          if (!postAuthorId) {
            if (modalTitle) modalTitle.textContent = '권한이 없습니다.';
            if (modalMessage) modalMessage.textContent = '본인이 쓴 글만 수정, 삭제할 수 있습니다.';
            if (modalOverlay) modalOverlay.classList.add('active');
            return;
          }
          
          const currentUserIdStr = String(currentUserId);
          const postAuthorIdStr = String(postAuthorId);
          
          if (currentUserIdStr === postAuthorIdStr) {
            // 작성자인 경우 - 모달 표시
            deleteTarget = 'post';
            if (modalTitle) modalTitle.textContent = '게시글을 삭제하시겠습니까?';
            if (modalMessage) modalMessage.textContent = '삭제한 내용은 복구할 수 없습니다.';
            if (modalOverlay) modalOverlay.classList.add('active');
          } else {
            // 작성자가 아닌 경우 - 모달로 표시
            if (modalTitle) modalTitle.textContent = '권한이 없습니다.';
            if (modalMessage) modalMessage.textContent = '본인이 쓴 글만 수정, 삭제할 수 있습니다.';
            if (modalOverlay) modalOverlay.classList.add('active');
          }
        });
      }
    } else {
      console.error('postActionsEl 요소를 찾을 수 없습니다!');
    }
  }

  // 댓글 조회
  async function loadComments() {
    if (!postId) {
      console.error('postId가 없습니다.');
      return;
    }

    try {
      console.log('댓글 조회 시작, postId:', postId);
      const response = await axios.get(`/comments/${postId}`, {
        withCredentials: true // 쿠키(세션) 전송을 위해 필요
      });
      
      console.log('댓글 응답:', response.data);
      
      // 응답 데이터가 배열인지 확인
      let comments = response.data;
      if (!Array.isArray(comments)) {
        // 배열이 아닌 경우, content 속성이나 data 속성 확인
        if (comments.content && Array.isArray(comments.content)) {
          comments = comments.content;
        } else if (comments.data && Array.isArray(comments.data)) {
          comments = comments.data;
        } else if (comments.comments && Array.isArray(comments.comments)) {
          comments = comments.comments;
        } else {
          console.warn('댓글 데이터 형식이 예상과 다릅니다:', comments);
          comments = [];
        }
      }
      
      // 디버깅: 첫 번째 댓글의 데이터 구조 확인
      if (comments.length > 0) {
        console.log('=== 첫 번째 댓글 데이터 구조 ===');
        console.log(JSON.stringify(comments[0], null, 2));
        console.log('첫 번째 댓글의 모든 키:', Object.keys(comments[0]));
        if (comments[0].user) {
          console.log('첫 번째 댓글의 user 객체 키:', Object.keys(comments[0].user));
        }
        if (comments[0].authorObj) {
          console.log('첫 번째 댓글의 authorObj 객체 키:', Object.keys(comments[0].authorObj));
        }
      }
      
      displayComments(comments);
    } catch (error) {
      console.error('댓글 로드 실패:', error);
      if (error.response) {
        console.error('에러 응답:', error.response.status, error.response.data);
      }
      // 에러 발생 시 빈 배열로 표시
      displayComments([]);
    }
  }

  // 댓글 표시
  function displayComments(comments) {
    // commentList 요소 다시 찾기 (동적으로 로드된 경우 대비)
    const commentListEl = document.getElementById('commentList') || commentList;
    
    if (!commentListEl) {
      console.error('commentList 요소를 찾을 수 없습니다.');
      return;
    }

    commentListEl.innerHTML = '';
    
    // comments가 배열이 아니거나 비어있는 경우
    if (!Array.isArray(comments) || comments.length === 0) {
      commentListEl.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">첫 댓글을 남겨주세요!</p>';
      return;
    }

    console.log('댓글 표시 시작, 댓글 개수:', comments.length);
    
    comments.forEach((comment, index) => {
      if (!comment) {
        console.warn(`댓글 ${index}번이 null입니다.`);
        return;
      }
      
      // id가 없어도 표시 (임시로 index 사용)
      const commentId = comment.id || comment.commentId || `temp-${index}`;
      
      try {
      const commentItem = createCommentElement(comment);
        commentListEl.appendChild(commentItem);
      } catch (error) {
        console.error(`댓글 ${index}번 생성 실패:`, error, comment);
      }
    });
    
    console.log('댓글 표시 완료');
  }

  // 프로필 이미지 HTML 생성 함수 (댓글용)
  function createCommentProfileImageHtml(authorName, profileImage) {
    if (profileImage) {
      return `<img src="${profileImage}" alt="${authorName}" class="comment-author-avatar-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`;
    }
    return '';
  }

  // 기본 아바타 HTML 생성 함수 (댓글용)
  function createCommentDefaultAvatarHtml(authorName) {
    const initial = (authorName || 'U').charAt(0).toUpperCase();
    return `<span class="comment-author-avatar-initial">${initial}</span>`;
  }

  // 댓글 요소 생성
  function createCommentElement(comment) {
    const div = document.createElement('div');
    div.className = 'comment-item';
    
    const commentId = comment.id || comment.commentId || comment.comment_id;
    if (commentId) {
      div.dataset.commentId = commentId;
    }

    // 댓글 내용 이스케이프 처리 (XSS 방지)
    const contents = (comment.contents || comment.content || comment.comment || '').toString();
    const escapedContents = contents
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    
    const author = comment.author || comment.authorNickname || comment.nickname || comment.userNickname || '익명';
    const createdAt = comment.createdAt || comment.createdDate || comment.createDate || comment.created_at;
    
    // 댓글 작성자 프로필 이미지 가져오기 (백엔드 users.image 필드도 지원)
    // 다양한 필드명과 중첩 구조 지원
    // 빈 문자열, null, 'null', undefined는 제외
    let commentAuthorProfileImage = null;
    
    // 유효한 이미지 값인지 확인하는 헬퍼 함수
    const isValidImage = (img) => {
      return img && img !== null && img !== 'null' && img !== '' && img !== undefined && img.trim() !== '';
    };
    
    // 직접 필드 확인
    if (isValidImage(comment.authorProfileImage)) commentAuthorProfileImage = comment.authorProfileImage;
    else if (isValidImage(comment.profileImage)) commentAuthorProfileImage = comment.profileImage;
    else if (isValidImage(comment.image)) commentAuthorProfileImage = comment.image;
    else if (isValidImage(comment.authorImage)) commentAuthorProfileImage = comment.authorImage;
    
    // user 객체 내부 확인
    if (!commentAuthorProfileImage && comment.user) {
      if (isValidImage(comment.user.image)) commentAuthorProfileImage = comment.user.image;
      else if (isValidImage(comment.user.profileImage)) commentAuthorProfileImage = comment.user.profileImage;
      else if (isValidImage(comment.user.authorImage)) commentAuthorProfileImage = comment.user.authorImage;
    }
    
    // authorObj 객체 내부 확인
    if (!commentAuthorProfileImage && comment.authorObj) {
      if (isValidImage(comment.authorObj.image)) commentAuthorProfileImage = comment.authorObj.image;
      else if (isValidImage(comment.authorObj.profileImage)) commentAuthorProfileImage = comment.authorObj.profileImage;
    }
    
    // userProfileImage 필드 확인
    if (!commentAuthorProfileImage && isValidImage(comment.userProfileImage)) {
      commentAuthorProfileImage = comment.userProfileImage;
    }
    
    // 디버깅: 프로필 이미지가 없으면 댓글 데이터 구조 확인
    if (!commentAuthorProfileImage) {
      console.log('댓글 프로필 이미지 없음:', {
        commentId: commentId,
        author: author,
        commentKeys: Object.keys(comment),
        userKeys: comment.user ? Object.keys(comment.user) : null,
        authorObjKeys: comment.authorObj ? Object.keys(comment.authorObj) : null,
        전체댓글데이터: comment
      });
    }

    // 댓글 작성자 ID 확인 (다양한 필드명 지원)
    const commentAuthorId = comment.userId || comment.authorId || comment.writerId || comment.user?.userId || comment.user?.id || comment.authorUserId;
    
    // 현재 사용자가 댓글 작성자인지 확인 (userId로만 비교)
    const currentUserIdStr = currentUserId ? String(currentUserId) : null;
    const commentAuthorIdStr = commentAuthorId ? String(commentAuthorId) : null;
    const isCommentAuthor = currentUserIdStr && commentAuthorIdStr && currentUserIdStr === commentAuthorIdStr;
    
    console.log('댓글 작성자 확인 (userId로만 비교):', {
      commentId,
      currentUserId: currentUserIdStr,
      commentAuthorId: commentAuthorIdStr,
      isCommentAuthor
    });
    
    // 댓글 수정/삭제 버튼 표시 (모두에게 보이게, commentId가 있는 경우만)
    const actionButtons = commentId ? `
      <div class="comment-actions">
        <button class="btn-comment-edit" onclick="editComment(${commentId}, '${escapedContents.replace(/'/g, "\\'")}', ${commentAuthorId || 'null'})">수정</button>
        <button class="btn-comment-delete" onclick="deleteComment(${commentId}, ${commentAuthorId || 'null'})">삭제</button>
      </div>
    ` : '';

    // 프로필 이미지 HTML 생성
    const commentProfileImageHtml = createCommentProfileImageHtml(author, commentAuthorProfileImage);
    const commentDefaultAvatarHtml = createCommentDefaultAvatarHtml(author);

    div.innerHTML = `
      <div class="comment-header">
        <div class="comment-author-info">
          <div class="comment-author-avatar">
            ${commentProfileImageHtml}
            ${commentDefaultAvatarHtml}
          </div>
        <div>
            <span class="comment-author">${author}</span>
            <span class="comment-date">${formatDate(createdAt)}</span>
        </div>
        </div>
        ${actionButtons}
      </div>
      <div class="comment-body">${escapedContents}</div>
    `;

    return div;
  }

  // 목록으로 버튼
  if (btnBack) {
  btnBack.addEventListener('click', () => {
    window.location.href = '/post-list';
  });
  }

  // 수정/삭제 버튼은 displayPost 함수에서 동적으로 생성되므로 여기서는 제거

  // 좋아요 버튼
  if (btnLike) {
  btnLike.addEventListener('click', async () => {
      // 로그인 확인
      if (!currentUserId) {
        alert('로그인이 필요합니다.');
        window.location.href = '/login';
        return;
      }

      try {
        // 좋아요 토글 API 호출 (POST /boards/{postId}/likes)
        // 백엔드는 body를 받지 않으므로 빈 body로 전송
        const response = await axios.post(`${POSTS_API_URL}/${postId}/likes`, {}, {
          withCredentials: true // 쿠키(세션) 전송을 위해 필요
        });

        const data = response.data;
        
        // 서버 응답에 따라 좋아요 상태 업데이트
        if (data.isLiked !== undefined) {
          isLiked = Boolean(data.isLiked);
        } else if (data.liked !== undefined) {
          isLiked = Boolean(data.liked);
        } else {
          // 응답에 isLiked가 없으면 토글
      isLiked = !isLiked;
        }
        
        // 좋아요 버튼 상태 명확하게 업데이트 (함수 사용)
        updateLikeButtonState(isLiked);
      
        // 서버에서 반환한 좋아요 수 사용
        if (data.likeCount !== undefined) {
          if (likeCount) likeCount.textContent = formatNumber(data.likeCount);
        } else if (data.likes !== undefined) {
          if (likeCount) likeCount.textContent = formatNumber(data.likes);
        } else {
          // 서버 응답에 좋아요 수가 없으면 클라이언트에서 계산
          const currentCount = parseInt((likeCount?.textContent || '0').replace(/k/g, '000'));
          const newCount = isLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
          if (likeCount) likeCount.textContent = formatNumber(newCount);
        }

        console.log('좋아요 상태:', { isLiked, likeCount: data.likeCount || data.likes });

    } catch (error) {
      console.error('좋아요 처리 실패:', error);
        const errorMessage = error.response?.data?.message || error.message || '좋아요 처리에 실패했습니다.';
        alert(errorMessage);
    }
  });
  }

  // 댓글 입력 감지
  if (commentInput && btnCommentSubmit) {
  commentInput.addEventListener('input', () => {
    const hasContent = commentInput.value.trim().length > 0;
    btnCommentSubmit.disabled = !hasContent;
  });
  }

  // 댓글 등록/수정
  if (btnCommentSubmit && commentInput) {
  btnCommentSubmit.addEventListener('click', async () => {
    const contents = commentInput.value.trim();
    if (!contents) return;

    try {
      let response;
      if (editingCommentId) {
        // 수정
          response = await axios.put(`/comments/${postId}/${editingCommentId}`, {
            contents
          }, {
          headers: { 'Content-Type': 'application/json' },
            withCredentials: true // 쿠키(세션) 전송을 위해 필요
        });
      } else {
        // 등록
          response = await axios.post(`/comments/${postId}`, {
            contents
          }, {
          headers: { 
            'Content-Type': 'application/json'
            },
            withCredentials: true // 쿠키(세션) 전송을 위해 필요
        });
      }

      commentInput.value = '';
      btnCommentSubmit.disabled = true;
      editingCommentId = null;
        if (commentBtnText) commentBtnText.textContent = '댓글 등록';
      
      loadComments();

    } catch (error) {
      console.error('댓글 처리 실패:', error);
        
        // 토큰 만료 에러인 경우
        if (error.response?.status === 401) {
          const errorData = error.response.data;
          
          if (errorData?.code === 'TOKEN_EXPIRED' || errorData?.message?.includes('토큰') || errorData?.message?.includes('만료')) {
            try {
              // 토큰 갱신 시도
              await axios.post('/auth/refresh', {}, {
                withCredentials: true
              });
              
              // 갱신 성공 시 원래 요청 재시도
              if (editingCommentId) {
                response = await axios.put(`/comments/${postId}/${editingCommentId}`, {
                  contents
                }, {
                  headers: { 'Content-Type': 'application/json' },
                  withCredentials: true
                });
              } else {
                response = await axios.post(`/comments/${postId}`, {
                  contents
                }, {
                  headers: { 'Content-Type': 'application/json' },
                  withCredentials: true
                });
              }
              
              commentInput.value = '';
              btnCommentSubmit.disabled = true;
              editingCommentId = null;
              if (commentBtnText) commentBtnText.textContent = '댓글 등록';
              
              loadComments();
              return;
            } catch (refreshError) {
              await handleTokenExpired();
              return;
            }
          }
        }
        
        const errorMessage = error.response?.data?.message || error.message || '댓글 처리에 실패했습니다.';
        alert(errorMessage);
      }
    });
  }

  // 댓글 수정 (전역 함수)
  window.editComment = (commentId, contents, commentAuthorId) => {
    // userId 확인
    if (!currentUserId) {
      // 로그인 필요 - modal 표시
      editTarget = 'login';
      if (modalTitle) modalTitle.textContent = '로그인이 필요합니다.';
      if (modalMessage) modalMessage.textContent = '로그인 페이지로 이동합니다.';
      if (modalOverlay) modalOverlay.classList.add('active');
      return;
    }
    
    if (!commentAuthorId || commentAuthorId === 'null' || commentAuthorId === null) {
      // 권한 없음 - modal 표시
      if (modalTitle) modalTitle.textContent = '권한이 없습니다.';
      if (modalMessage) modalMessage.textContent = '본인이 쓴 글만 수정, 삭제할 수 있습니다.';
      if (modalOverlay) modalOverlay.classList.add('active');
      return;
    }
    
    const currentUserIdStr = String(currentUserId);
    const commentAuthorIdStr = String(commentAuthorId);
    
    if (currentUserIdStr === commentAuthorIdStr) {
      // 작성자인 경우 - 바로 수정 모드로 전환
    editingCommentId = commentId;
      if (commentInput) {
    commentInput.value = contents;
    commentInput.focus();
        // 커서를 텍스트 끝으로 이동
        commentInput.setSelectionRange(contents.length, contents.length);
      }
      if (btnCommentSubmit) btnCommentSubmit.disabled = false;
      if (commentBtnText) commentBtnText.textContent = '댓글 수정';
      
      // 댓글 입력창으로 스크롤
      if (commentInput) {
        commentInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      // 작성자가 아닌 경우 - modal 표시
      if (modalTitle) modalTitle.textContent = '권한이 없습니다.';
      if (modalMessage) modalMessage.textContent = '본인이 쓴 글만 수정, 삭제할 수 있습니다.';
      if (modalOverlay) modalOverlay.classList.add('active');
    }
  };

  // 댓글 삭제 (전역 함수)
  window.deleteComment = (commentId, commentAuthorId) => {
    // userId 확인
    if (!currentUserId) {
      // 로그인 필요 - modal 표시
      deleteTarget = 'login';
      if (modalTitle) modalTitle.textContent = '로그인이 필요합니다.';
      if (modalMessage) modalMessage.textContent = '로그인 페이지로 이동합니다.';
      if (modalOverlay) modalOverlay.classList.add('active');
      return;
    }
    
    if (!commentAuthorId || commentAuthorId === 'null' || commentAuthorId === null) {
      // 권한 없음 - modal 표시
      if (modalTitle) modalTitle.textContent = '권한이 없습니다.';
      if (modalMessage) modalMessage.textContent = '본인이 쓴 글만 수정, 삭제할 수 있습니다.';
      if (modalOverlay) modalOverlay.classList.add('active');
      return;
    }
    
    const currentUserIdStr = String(currentUserId);
    const commentAuthorIdStr = String(commentAuthorId);
    
    if (currentUserIdStr === commentAuthorIdStr) {
      // 작성자인 경우 - 삭제 확인 modal 표시
    deleteTarget = 'comment';
    deleteCommentId = commentId;
      if (modalTitle) modalTitle.textContent = '댓글을 삭제하시겠습니까?';
      if (modalMessage) modalMessage.textContent = '삭제한 댓글은 복구할 수 없습니다.';
      if (modalOverlay) modalOverlay.classList.add('active');
    } else {
      // 작성자가 아닌 경우 - modal 표시
      if (modalTitle) modalTitle.textContent = '권한이 없습니다.';
      if (modalMessage) modalMessage.textContent = '본인이 쓴 글만 수정, 삭제할 수 있습니다.';
      if (modalOverlay) modalOverlay.classList.add('active');
    }
  };

  // 모달 취소
  if (btnModalCancel) {
  btnModalCancel.addEventListener('click', () => {
      if (modalOverlay) modalOverlay.classList.remove('active');
    deleteTarget = null;
    deleteCommentId = null;
    editTarget = null;
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

  // 모달 확인
  if (btnModalConfirm) {
  btnModalConfirm.addEventListener('click', async () => {
    try {
      // 토큰 만료 상황 처리
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
        return;
      }
      
      if (editTarget === 'login') {
        // 로그인 필요 - 로그인 페이지로 이동
        if (modalOverlay) modalOverlay.classList.remove('active');
        editTarget = null;
        window.location.href = '/login';
      } else if (editTarget === 'post') {
        // 게시글 수정 - 수정 페이지로 이동
        if (modalOverlay) modalOverlay.classList.remove('active');
        editTarget = null;
        window.location.href = `/post-edit?id=${postId}`;
      } else if (deleteTarget === 'login') {
        // 로그인 필요 - 로그인 페이지로 이동
        if (modalOverlay) modalOverlay.classList.remove('active');
        deleteTarget = null;
        window.location.href = '/login';
      } else if (!editTarget && !deleteTarget) {
        // 권한 없음 등의 일반 메시지 - 모달만 닫기
        if (modalOverlay) modalOverlay.classList.remove('active');
      } else if (deleteTarget === 'post') {
          // 게시글 삭제 (토큰 만료 시 자동 갱신)
          console.log('=== 게시글 삭제 시도 ===');
          console.log('postId:', postId);
          console.log('현재 사용자 userId:', currentUserId);
          console.log('게시글 작성자 userId:', postAuthorId);
          console.log('작성자 일치:', String(currentUserId) === String(postAuthorId));
          
          const deleteResponse = await retryWithTokenRefresh(async () => {
            console.log('삭제 API 호출:', `${POSTS_API_URL}/${postId}`);
            return await axios.delete(`${POSTS_API_URL}/${postId}`, {
              withCredentials: true
            });
          });
          
          console.log('게시글 삭제 성공:', deleteResponse);
          
        // 삭제 성공 - 모달 메시지 변경 후 이동
        if (modalTitle) modalTitle.textContent = '게시글이 삭제되었습니다.';
        if (modalMessage) modalMessage.textContent = '게시글 목록으로 이동합니다.';
        // 모달은 열린 상태로 유지하고, 1.5초 후 자동으로 이동
        setTimeout(() => {
          if (modalOverlay) modalOverlay.classList.remove('active');
          deleteTarget = null;
          window.location.href = '/post-list';
        }, 1500);
        return; // finally 블록 실행 방지
      } else if (deleteTarget === 'comment') {
          // 댓글 삭제 (토큰 만료 시 자동 갱신)
          await retryWithTokenRefresh(async () => {
            return await axios.delete(`/comments/${postId}/${deleteCommentId}`, {
              withCredentials: true
            });
          });
          
        loadComments();
      }
    } catch (error) {
      console.error('처리 실패:', error);
      console.error('에러 상세:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
        
        let errorMessage = '처리에 실패했습니다.';
        
        if (error.response) {
          const errorData = error.response.data;
          
          if (error.response.status === 403) {
            // 403 에러 상세 정보 표시
            const details = errorData?.details ? JSON.stringify(errorData.details) : '';
            errorMessage = errorData?.message || '권한이 없습니다. 작성자만 수정/삭제할 수 있습니다.';
            if (details) {
              errorMessage += `\n상세: ${details}`;
            }
            console.error('403 에러 상세:', {
              message: errorData?.message,
              code: errorData?.code,
              details: errorData?.details,
              전체응답: errorData
            });
          } else if (error.response.status === 401) {
            errorMessage = errorData?.message || '인증이 필요합니다. 다시 로그인해주세요.';
          } else if (error.response.status === 500) {
            errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
          } else if (error.response.status === 404) {
            errorMessage = '게시글을 찾을 수 없습니다.';
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          }
        } else if (error.request) {
          errorMessage = '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.';
        }
        
        // 에러 메시지를 모달로 표시
        if (modalTitle) modalTitle.textContent = '오류가 발생했습니다.';
        if (modalMessage) modalMessage.textContent = errorMessage;
        // 모달은 이미 열려있으므로 에러 메시지만 업데이트
        
        // 삭제 실패 시 deleteTarget 초기화
        if (deleteTarget === 'post') {
          deleteTarget = null;
        }
    } finally {
        // 게시글 삭제 성공이 아닌 경우에만 모달 닫기
        if (deleteTarget !== 'post') {
          if (modalOverlay) modalOverlay.classList.remove('active');
      deleteTarget = null;
      deleteCommentId = null;
          editTarget = null;
        }
    }
  });
  }

  // 모달 외부 클릭 방지
  if (modalOverlay) {
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      // 배경 클릭해도 닫히지 않음
    }
  });
  }

  // 좋아요 버튼 초기 상태 설정 (페이지 로드 시 - 게시글 데이터 로드 전 임시 상태)
  // 실제 좋아요 상태는 loadPost() 함수에서 게시글 데이터를 받은 후 업데이트됩니다
  if (btnLike) {
    const likeIcon = btnLike.querySelector('.like-icon');
    if (likeIcon) {
      likeIcon.textContent = '🤍'; // 초기 임시 상태: 흰색 하트
    }
    btnLike.classList.remove('active'); // 초기 임시 상태: 비활성화
  }

  // 초기 로드: 먼저 사용자 정보를 가져온 후 게시글 로드
  // 게시글 로드 후 좋아요 상태가 자동으로 업데이트됩니다
  (async () => {
    await loadCurrentUser();
    loadPost(); // loadPost() 내부에서 좋아요 상태를 업데이트합니다
  })();
});