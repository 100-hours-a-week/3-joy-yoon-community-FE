const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');

const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const userRoutes = require('./routes/user');

const app = express();
const port = 3000;

// 환경변수에서 세션 시크릿 가져오기 (없으면 랜덤 생성)
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// 보안이 강화된 세션 설정
app.use(
    session({
        secret: SESSION_SECRET,
        name: 'sessionId', // 기본 connect.sid 대신 커스텀 이름 사용
        saveUninitialized: false, // 빈 세션 저장 안함
        resave: false,
        cookie: {
            httpOnly: true, // JavaScript에서 쿠키 접근 불가 (XSS 방지)
            secure: process.env.NODE_ENV === 'production', // HTTPS에서만 쿠키 전송 (프로덕션)
            sameSite: 'lax', // CSRF 방지
            maxAge: 24 * 60 * 60 * 1000, // 쿠키 유효 시간 (1일)
        },
    }),
);

// 정적 파일 제공 (라우터보다 먼저 배치하여 정적 파일 요청이 우선 처리되도록)
app.use(express.static(path.join(__dirname, 'public')));

// 인증 미들웨어 - 로그인이 필요한 페이지 보호
const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    // API 요청인 경우
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ message: '로그인이 필요합니다.' });
    }
    // 페이지 요청인 경우
    return res.redirect('/login');
};

// 라우터 등록
app.use('/auth', authRoutes);
app.use('/boards', postsRoutes);
app.use('/comments', commentRoutes);
app.use('/users', userRoutes);

// 보호되지 않는 페이지 (로그인 불필요)
const publicPages = ['login', 'signup'];

// 보호되는 페이지 (로그인 필요)
const protectedPages = [
    'post-create', 'post-list', 'post-detail', 
    'post-edit', 'profile-modify', 'change-password'
];

// 공개 페이지 라우팅
publicPages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        // 이미 로그인된 사용자는 게시글 목록으로 리다이렉트
        if (req.session && req.session.userId) {
            return res.redirect('/post-list');
        }
        res.sendFile(path.join(__dirname, 'public', `${page}.html`));
    });
});

// 보호된 페이지 라우팅
protectedPages.forEach(page => {
    app.get(`/${page}`, requireAuth, (req, res) => {
        res.sendFile(path.join(__dirname, 'public', `${page}.html`));
    });
});

// 루트 페이지
app.get('/', (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/post-list');
    }
    res.redirect('/login');
});

// /auth/me는 routes/auth.js에서 처리하므로 여기서는 제거

app.listen(port, () => {
    console.log(`🚀 서버 실행 중: http://localhost:${port}`);
    if (process.env.NODE_ENV !== 'production') {
        console.log('개발 모드: HTTPS 없이 실행 중');
    }
});
