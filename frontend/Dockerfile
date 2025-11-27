# Node.js 20 버전 사용
FROM node:20

# 1. 작업 디렉토리를 가장 먼저 설정합니다. (이후 모든 명령어는 /app 기준)
WORKDIR /app

# 2. 시스템 사용자 설정 (작성하신 내용 유지)
ARG USERNAME=community-fe
ARG USER_UID=1001
ARG USER_GID=$USER_UID

RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && apt-get update \
    && apt-get install -y sudo \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME

# 3. 의존성 파일 복사 (권한 부여 포함)
# COPY 할 때 chown을 안 하면 root 소유가 되어버립니다.
COPY --chown=$USERNAME:$USERNAME package*.json ./

# 4. 의존성 설치
RUN npm install --omit=dev

# 5. 소스 코드 복사 (권한 부여 포함)
COPY --chown=$USERNAME:$USERNAME . .

# 6. 사용자 변경
USER $USERNAME

# 7. 환경 변수 설정
ENV NODE_ENV=production

# 8. 포트 노출
EXPOSE 3000

# 9. 실행
CMD ["node", "app.js"]