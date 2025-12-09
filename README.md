# CommuKnit - 뜨개질 커뮤니티 프론트엔드

CommuKnit은 뜨개질을 사랑하는 사람들이 모인 따뜻한 커뮤니티 플랫폼입니다.

## 📋 목차

- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [시작하기](#시작하기)
- [환경 설정](#환경-설정)
- [주요 기능](#주요-기능)
- [API 엔드포인트](#api-엔드포인트)
- [개발 가이드](#개발-가이드)

## 🛠 기술 스택

- **프레임워크**: Express.js 5.1.0
- **언어**: JavaScript (Node.js)
- **템플릿 엔진**: EJS
- **세션 관리**: express-session
- **HTTP 클라이언트**: Axios
- **스타일링**: CSS3

## 📁 프로젝트 구조

```
frontend/
├── app.js                 # Express 서버 메인 파일
├── package.json           # 프로젝트 의존성 관리
├── Dockerfile             # Docker 이미지 빌드 설정
├── public/                # 정적 파일
│   ├── css/              # 스타일시트
│   ├── js/               # 클라이언트 사이드 JavaScript
│   │   ├── config.js     # API 설정
│   │   ├── layout.js     # 공통 레이아웃 로더
│   │   ├── login.js      # 로그인 로직
│   │   ├── signup.js     # 회원가입 로직
│   │   ├── post-list.js  # 게시글 목록
│   │   ├── post-detail.js # 게시글 상세
│   │   ├── post-create.js # 게시글 작성
│   │   ├── post-edit.js   # 게시글 수정
│   │   └── ...
│   ├── components/       # 재사용 가능한 컴포넌트
│   │   ├── header.html   # 헤더 컴포넌트
│   │   └── footer.html   # 푸터 컴포넌트
│   └── *.html           # 페이지 HTML 파일
├── routes/               # Express 라우터
│   ├── auth.js          # 인증 관련 라우트
│   ├── posts.js         # 게시글 관련 라우트
│   ├── comments.js      # 댓글 관련 라우트
│   └── user.js          # 사용자 관련 라우트
└── utils/               # 유틸리티 함수
    └── tokenStore.js    # 토큰 관리
```

## 🚀 시작하기

### 사전 요구사항

- Node.js 20 이상
- npm 또는 yarn
- 백엔드 서버 (Spring Boot) 실행 중 (포트 8080)

### 설치

1. 저장소 클론
```bash
git clone <repository-url>
cd 4th_frontendknit
```

2. 의존성 설치
```bash
cd frontend
npm install
```

3. 환경 변수 설정 (선택사항)
```bash
# .env 파일 생성 (선택사항)
SESSION_SECRET=your-secret-key
API_BASE_URL=http://localhost:8080/api
```

### 실행

```bash
# 개발 서버 시작
npm start

# 또는
node app.js
```

서버가 실행되면 `http://localhost:3000`에서 접속할 수 있습니다.

## ⚙️ 환경 설정

### 백엔드 연결

프론트엔드는 기본적으로 `http://localhost:8080/api`로 백엔드에 연결합니다.

설정 파일: `frontend/public/js/config.js`
```javascript
window.CONFIG = {
  API_BASE_URL: 'http://localhost:8080',
  FRONTEND_URL: 'http://localhost:3000',
  // ...
};
```

### 세션 설정

세션은 `express-session`을 사용하여 관리됩니다. 세션 시크릿은 환경 변수 `SESSION_SECRET`으로 설정하거나 자동 생성됩니다.

## ✨ 주요 기능

### 인증
- ✅ 회원가입 (이메일, 비밀번호, 닉네임, 프로필 이미지)
- ✅ 로그인/로그아웃
- ✅ 이메일/닉네임 중복 체크
- ✅ 비밀번호 변경
- ✅ 회원정보 수정
- ✅ 회원 탈퇴

### 게시글
- ✅ 게시글 목록 조회
- ✅ 게시글 상세 조회
- ✅ 게시글 작성
- ✅ 게시글 수정
- ✅ 게시글 삭제
- ✅ 게시글 좋아요
- ✅ 이미지 업로드

### 댓글
- ✅ 댓글 목록 조회
- ✅ 댓글 작성
- ✅ 댓글 수정
- ✅ 댓글 삭제

### 프로필
- ✅ 프로필 이미지 업로드/삭제
- ✅ 이미지 압축 (자동)
- ✅ 닉네임 수정

## 🔌 API 엔드포인트

### 인증
- `POST /api/auth/login` - 로그인
- `POST /api/auth/signup` - 회원가입
- `POST /api/auth/logout` - 로그아웃
- `GET /api/auth/check-email` - 이메일 중복 체크
- `GET /api/auth/check-nickname` - 닉네임 중복 체크

### 게시글
- `GET /api/boards` - 게시글 목록
- `GET /api/boards/:id` - 게시글 상세
- `POST /api/boards` - 게시글 작성
- `PUT /api/boards/:id` - 게시글 수정
- `DELETE /api/boards/:id` - 게시글 삭제
- `POST /api/boards/:id/likes` - 좋아요 토글

### 댓글
- `GET /api/comments/:postId` - 댓글 목록
- `POST /api/comments/:postId` - 댓글 작성
- `PUT /api/comments/:id` - 댓글 수정
- `DELETE /api/comments/:id` - 댓글 삭제

### 사용자
- `GET /api/users/me` - 현재 사용자 정보
- `PUT /api/users/me` - 사용자 정보 수정
- `PUT /api/users/me/password` - 비밀번호 변경
- `DELETE /api/users/me` - 회원 탈퇴

## 📝 개발 가이드

### 코드 스타일
- JavaScript ES6+ 문법 사용
- 비동기 처리는 async/await 사용
- 에러 처리는 try-catch 사용

### 파일 구조 규칙
- HTML 파일: `public/*.html`
- JavaScript 파일: `public/js/*.js`
- CSS 파일: `public/css/*.css`
- 라우터: `routes/*.js`

### 공통 컴포넌트
- Header와 Footer는 `layout.js`를 통해 동적으로 로드됩니다.
- 각 페이지는 `header-placeholder`와 `footer-placeholder` div를 포함해야 합니다.

### 이미지 처리
- 프로필 이미지는 자동으로 압축됩니다 (최대 400x400px, 품질 0.7)
- 이미지 크기는 5MB 이하로 제한됩니다.
- Base64 형식으로 전송됩니다.

## 🐳 Docker

Docker를 사용하여 실행할 수 있습니다:

```bash
# 이미지 빌드
docker build -t commuknit-frontend .

# 컨테이너 실행
docker run -p 3000:3000 commuknit-frontend
```

## 📄 라이선스

ISC

## 👥 기여자

프로젝트에 기여해주셔서 감사합니다!

## 📞 문의

이슈가 있으시면 GitHub Issues에 등록해주세요.

