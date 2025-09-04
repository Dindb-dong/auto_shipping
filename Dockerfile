# 멀티 스테이지 빌드로 보안 및 크기 최적화

# --- 빌드 스테이지 ---
FROM mirror.gcr.io/library/node:20-alpine AS build

# 보안 업데이트
RUN apk --no-cache upgrade

WORKDIR /app

# 서버 패키지 파일 복사
COPY server/package*.json ./server/
RUN cd server && npm ci

# 소스 코드 복사
COPY server ./server

# TypeScript 빌드
WORKDIR /app/server
RUN npm run build

# --- 프로덕션 스테이지 ---
FROM mirror.gcr.io/library/node:20-alpine AS production

# 보안 업데이트 + dumb-init 설치
RUN apk --no-cache upgrade && apk add --no-cache dumb-init

# 비root 사용자 생성
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app/server

# 프로덕션 의존성 설치
COPY server/package*.json ./
RUN npm ci --omit=dev

# 빌드 결과물만 복사
COPY --from=build --chown=nodejs:nodejs /app/server/dist ./dist

# 사용자 변경
USER nodejs

# 포트 노출
EXPOSE 3000

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# dumb-init으로 프로세스 관리
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]