document.addEventListener('DOMContentLoaded', () => {
  const postList = document.getElementById('postList');
  const loading = document.getElementById('loading');
  const btnWrite = document.getElementById('btnWrite');

  let currentPage = 0;
  let isLoading = false;
  let hasMore = true;

  // Express 서버의 /boards 엔드포인트 사용 (세션을 통한 인증 처리)
  const POSTS_API_URL = '/boards';

  // 게시글 작성 버튼
  btnWrite.addEventListener('click', () => {
    window.location.href = '/post-create';
  });

  // 숫자 포맷팅 함수 (1k, 10k, 100k)
  function formatNumber(num) {
    if (num >= 100000) {
      return Math.floor(num / 1000) + 'k';
    } else if (num >= 10000) {
      return Math.floor(num / 1000) + 'k';
    } else if (num >= 1000) {
      return Math.floor(num / 1000) + 'k';
    }
    return num.toString();
  }

  // 날짜 포맷팅 함수 (yyyy-mm-dd hh:mm:ss)
  function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

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

  // 게시글 카드 생성
  function createPostCard(post) {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.dataset.postId = post.id;

    // 제목 26자 제한
    const displayTitle = post.title.length > 26 
      ? post.title.substring(0, 26) 
      : post.title;

    // 작성자 프로필 이미지 가져오기 (게시글 상세와 동일한 로직)
    const authorName = post.author || post.authorNickname || post.nickname || '익명';
    
    // 프로필 이미지 찾기 (다양한 경로 탐색 - 게시글 상세와 동일)
    // 빈 문자열, null, 'null', undefined는 제외
    let authorProfileImage = null;
    
    // 유효한 이미지 값인지 확인하는 헬퍼 함수
    const isValidImage = (img) => {
      return img && img !== null && img !== 'null' && img !== '' && img !== undefined && img.trim() !== '';
    };
    
    // 직접 필드 확인 (더 많은 필드명 확인)
    if (isValidImage(post.authorProfileImage)) authorProfileImage = post.authorProfileImage;
    else if (isValidImage(post.profileImage)) authorProfileImage = post.profileImage;
    else if (isValidImage(post.image)) authorProfileImage = post.image;
    else if (isValidImage(post.authorImage)) authorProfileImage = post.authorImage;
    else if (isValidImage(post.userImage)) authorProfileImage = post.userImage;
    else if (isValidImage(post.userProfileImage)) authorProfileImage = post.userProfileImage;
    
    // user 객체 내부 확인 (더 깊이 탐색)
    if (!authorProfileImage && post.user) {
      if (isValidImage(post.user.image)) authorProfileImage = post.user.image;
      else if (isValidImage(post.user.profileImage)) authorProfileImage = post.user.profileImage;
      else if (isValidImage(post.user.authorImage)) authorProfileImage = post.user.authorImage;
      else if (isValidImage(post.user.userImage)) authorProfileImage = post.user.userImage;
      else if (isValidImage(post.user.userProfileImage)) authorProfileImage = post.user.userProfileImage;
    }
    
    // authorObj 객체 내부 확인
    if (!authorProfileImage && post.authorObj) {
      if (isValidImage(post.authorObj.image)) authorProfileImage = post.authorObj.image;
      else if (isValidImage(post.authorObj.profileImage)) authorProfileImage = post.authorObj.profileImage;
      else if (isValidImage(post.authorObj.userImage)) authorProfileImage = post.authorObj.userImage;
      else if (isValidImage(post.authorObj.userProfileImage)) authorProfileImage = post.authorObj.userProfileImage;
    }
    
    // author 객체 내부 확인 (authorObj와 별도)
    if (!authorProfileImage && post.author) {
      if (typeof post.author === 'object' && post.author !== null) {
        if (isValidImage(post.author.image)) authorProfileImage = post.author.image;
        else if (isValidImage(post.author.profileImage)) authorProfileImage = post.author.profileImage;
        else if (isValidImage(post.author.userImage)) authorProfileImage = post.author.userImage;
      }
    }
    
    // 모든 필드를 순회하며 이미지 찾기 (마지막 수단)
    if (!authorProfileImage) {
      const allKeys = Object.keys(post);
      for (const key of allKeys) {
        if (key.toLowerCase().includes('image') || key.toLowerCase().includes('profile')) {
          const value = post[key];
          if (isValidImage(value)) {
            authorProfileImage = value;
            console.log('게시글 목록 - 프로필 이미지 발견 (동적 필드):', key, value.substring(0, 50) + '...');
            break;
          }
        }
      }
    }
    
    // 디버깅: 프로필 이미지 찾기 실패 시 로그 (첫 번째 게시글만)
    if (!authorProfileImage) {
      const imageRelatedKeys = Object.keys(post).filter(key => 
        key.toLowerCase().includes('image') || 
        key.toLowerCase().includes('profile') ||
        key.toLowerCase().includes('avatar') ||
        key.toLowerCase().includes('user') ||
        key.toLowerCase().includes('author')
      );
      console.log('게시글 목록 - 프로필 이미지 없음:', {
        postId: post.id || post.postId,
        author: authorName,
        hasUser: !!post.user,
        hasAuthorObj: !!post.authorObj,
        hasAuthor: !!post.author,
        userKeys: post.user ? Object.keys(post.user) : null,
        authorObjKeys: post.authorObj ? Object.keys(post.authorObj) : null,
        authorKeys: (typeof post.author === 'object' && post.author !== null) ? Object.keys(post.author) : null,
        imageRelatedKeys: imageRelatedKeys,
        전체키: Object.keys(post),
        전체데이터: post
      });
    } else {
      console.log('게시글 목록 - 프로필 이미지 찾음:', {
        postId: post.id || post.postId,
        author: authorName,
        imageSource: authorProfileImage.substring(0, 50) + '...'
      });
    }

    // 프로필 이미지 HTML 생성
    const profileImageHtml = createProfileImageHtml(authorName, authorProfileImage);
    const defaultAvatarHtml = createDefaultAvatarHtml(authorName);

    card.innerHTML = `
      <div class="post-card-header">
        <h3 class="post-list-title">${displayTitle}</h3>
        <div class="post-meta">
        <span class="post-stat">좋아요 ${formatNumber(post.likes)}</span>
        <span class="post-stat">댓글 ${formatNumber(post.comments)}</span>
        <span class="post-stat">조회 ${formatNumber(post.views)}</span>
        <span class="post-date">${formatDate(post.createdAt)}</span>
        </div>
        </div>
        <div class="post-stats">
          <div class="post-author-info">
            <div class="author-avatar">
              ${profileImageHtml}
              ${defaultAvatarHtml}
            </div>
            <span class="post-author">${authorName}</span>
          </div>
      </div>
    `;

    // 카드 클릭 시 상세 페이지로 이동
    card.addEventListener('click', () => {
      window.location.href = `/post-detail?id=${post.id}`;
    });

    return card;
  }

  // 게시글 로드
  async function loadPosts() {
    if (isLoading || !hasMore) return;

    isLoading = true;
    loading.style.display = 'block';

    const url = `${POSTS_API_URL}?page=${currentPage}&size=10`;
    console.log('요청 URL:', url);

    try {
      const response = await axios.get(url, {
        withCredentials: true // 쿠키(세션) 전송을 위해 필요
      });
      
      console.log('응답 상태:', response.status);
      
      const data = response.data;
      console.log('받은 데이터:', data);
      
      // Spring Data JPA의 Page 객체 구조
      const posts = data.content;
      const isLastPage = data.last;

      // 데이터가 없으면 더 이상 로드하지 않음
      if (posts.length === 0 || isLastPage) {
        hasMore = false;
        if (posts.length === 0 && currentPage === 0) {
          postList.innerHTML = '<div class="no-posts">게시글이 없습니다.</div>';
        }
      }

      // 게시글 카드 추가
      posts.forEach((post, index) => {
        // 첫 번째 게시글의 데이터 구조 확인 (디버깅)
        if (index === 0) {
          console.log('=== 게시글 목록 첫 번째 게시글 데이터 ===');
          console.log('전체 데이터:', post);
          console.log('모든 키:', Object.keys(post));
          if (post.user) {
            console.log('user 객체:', post.user);
            console.log('user 객체의 키:', Object.keys(post.user));
          }
          // 프로필 이미지 관련 필드 찾기
          const imageFields = Object.keys(post).filter(key => 
            key.toLowerCase().includes('image') || 
            key.toLowerCase().includes('profile') ||
            key.toLowerCase().includes('avatar')
          );
          console.log('이미지 관련 필드:', imageFields);
        }
        const card = createPostCard(post);
        postList.appendChild(card);
      });

      // 마지막 페이지면 추가 요청 중단
      if (isLastPage) {
        hasMore = false;
        console.log("마지막 페이지입니다. 추가 로드 중단");
      } else {
        currentPage++;
      }
      // currentPage++;

    } catch (error) {
      console.error('게시글 로드 실패:', error);
      
      // 첫 페이지 로드 실패 시 더미 데이터 표시 (개발용)
      if (currentPage === 0) {
        console.log('API 연결 실패. 더미 데이터를 표시합니다.');
        loadDummyData();
      } else {
        alert('게시글을 불러오는데 실패했습니다: ' + error.message);
      }
    } finally {
      isLoading = false;
      loading.style.display = 'none';
    }
  }

  // 더미 데이터 로드 (개발/테스트용)
  function loadDummyData() {
    const dummyPosts = [
      {
        id: 1,
        title: '첫 번째 게시글입니다',
        author: '홍길동',
        createdAt: new Date().toISOString(),
        likes: 1500,
        comments: 30,
        views: 5000
      },
      {
        id: 2,
        title: '두 번째 게시글 제목입니다',
        author: '김철수',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        likes: 500,
        comments: 15,
        views: 2000
      },
      {
        id: 3,
        title: '세 번째 게시글 제목이 길어요 최대26자',
        author: '이영희',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        likes: 12000,
        comments: 150,
        views: 50000
      },
      {
        id: 4,
        title: '네 번째 게시글',
        author: '박민수',
        createdAt: new Date(Date.now() - 10800000).toISOString(),
        likes: 850,
        comments: 42,
        views: 3200
      },
      {
        id: 5,
        title: '다섯 번째 게시글입니다',
        author: '정수진',
        createdAt: new Date(Date.now() - 14400000).toISOString(),
        likes: 125000,
        comments: 2300,
        views: 180000
      }
    ];

    dummyPosts.forEach(post => {
      const card = createPostCard(post);
      postList.appendChild(card);
    });

    hasMore = false; // 더미 데이터는 한 번만 로드
  }

  // 무한 스크롤
  function handleScroll() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    // 스크롤이 하단 근처에 도달하면 다음 페이지 로드
    if (scrollTop + windowHeight >= documentHeight - 200) {
      loadPosts();
    }
  }

  // 스크롤 이벤트 리스너 (throttle 적용)
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    scrollTimeout = setTimeout(handleScroll, 100);
  });

  // 초기 로드
  loadPosts();
});