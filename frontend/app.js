const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: 'community',
        saveUninitialized: true,
        resave: false,
        cookie:{
            secret:false,
            maxAge: 24 * 60 * 60 * 1000, // 쿠키 유효 시간 (1일)
        },
    }),
);

// 라우터 등록
app.use('/auth', authRoutes);
app.use('/boards', postsRoutes);
app.use('/comments', commentRoutes);

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

// HTML 페이지 라우팅
const pages = [
  'login', 'signup', 'post-create', 'post-list',
  'post-detail', 'post-edit', 'profile-modify', 'change-password'
];

pages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', `${page}.html`));
  });
});

app.listen(port, () => {
  console.log(`서버 실행 중: http://localhost:${port}`);
});
