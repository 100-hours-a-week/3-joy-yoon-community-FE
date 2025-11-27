# 1. Node.js 20 버전 slim 이미지 사용
FROM node:20-slim

# 2. 컨테이너 내 작업 디렉터리 지정
WORKDIR /app

# 3. package.json과 package-lock.json 복사
COPY package*.json ./

# 4. 의존성 설치
RUN npm install

# 5. 전체 소스 복사
COPY . .

# 6. 포트 오픈
EXPOSE 3000

# 7. 실행 명령
CMD ["node", "app.js"]
