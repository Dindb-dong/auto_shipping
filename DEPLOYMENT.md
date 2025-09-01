# 배포 가이드

이 문서는 Auto Shipping 시스템을 Railway, Cloudflare Pages, Supabase에 배포하는 방법을 설명합니다.

## 🏗️ 아키텍처 개요

```
[로지뷰] ──► https://api.your-domain.com/webhook/logiview (Zero Trust: Service Token)
                           │
                           ▼
                     [Railway: Express]
    /oauth/callback ◄── 카페24 브라우저 리다이렉트
           │
           ▼
      Cafe24 OAuth 토큰 교환 → Supabase(토큰, 로그 저장)
           │
           ▼
    카페24 Admin API (shipments POST/PUT)

[Cloudflare Pages: 프론트] https://app.your-domain.com
  └ 설정/대시보드/테스트 호출 (Zero Trust: Email/SSO)

DNS: Cloudflare
접근제어: Cloudflare Zero Trust
DB: Supabase (Postgres + Auth 비활성, RLS는 로그 테이블 off)
```

## 📋 사전 준비사항

### 1. 도메인 설정

- Cloudflare에 도메인 등록 (예: `your-domain.com`)
- 네임서버를 Cloudflare로 변경

### 2. 카페24 개발자 계정

- 카페24 개발자센터에서 앱 생성
- 필요한 권한: `mall.read_order`, `mall.write_order`

### 3. Supabase 프로젝트

- Supabase 계정 생성
- 새 프로젝트 생성
- DATABASE_URL 확보

## 🚀 단계별 배포

### 1단계: Supabase 데이터베이스 설정

1. **Supabase 프로젝트 생성**

   ```bash
   # Supabase 대시보드에서 새 프로젝트 생성
   # 프로젝트 URL과 API 키 확인
   ```

2. **데이터베이스 스키마 적용**

   ```bash
   # Supabase SQL Editor에서 실행
   cat server/supabase-schema.sql
   ```

3. **연결 정보 확인**
   - Settings → Database → Connection string
   - `postgresql://postgres:[password]@[host]:5432/postgres` 형식

### 2단계: Railway 백엔드 배포

1. **Railway 계정 생성 및 프로젝트 생성**

   ```bash
   # Railway CLI 설치 (선택사항)
   npm install -g @railway/cli
   railway login
   ```

2. **GitHub 리포지토리 연결**

   - Railway 대시보드에서 "Deploy from GitHub repo" 선택
   - `server` 폴더를 루트로 설정

3. **환경변수 설정**
   Railway 대시보드 → Variables에서 다음 변수들 설정:

   ```env
   NODE_ENV=production
   PORT=3000
   MALL_ID=your_mall_id
   CAFE24_CLIENT_ID=your_client_id
   CAFE24_CLIENT_SECRET=your_client_secret
   OAUTH_REDIRECT_URI=https://api.your-domain.com/oauth/callback
   DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
   PARTNER_API_KEY=your_partner_api_key
   CF_ACCESS_CLIENT_ID=your_cf_access_client_id
   CF_ACCESS_CLIENT_SECRET=your_cf_access_client_secret
   FRONTEND_URL=https://app.your-domain.com
   ```

4. **커스텀 도메인 설정**
   - Railway → Settings → Domains
   - `api.your-domain.com` 추가
   - DNS 설정 안내에 따라 Cloudflare DNS에 CNAME 레코드 추가

### 3단계: Cloudflare Pages 프론트엔드 배포

1. **Cloudflare Pages 프로젝트 생성**

   - Cloudflare 대시보드 → Pages → Create a project
   - GitHub 리포지토리 연결
   - `web` 폴더를 루트로 설정

2. **빌드 설정**

   ```
   Build command: npm run build
   Build output directory: dist
   Root directory: web
   ```

3. **환경변수 설정**

   ```
   VITE_API_BASE_URL=https://api.your-domain.com
   VITE_APP_NAME=Auto Shipping
   VITE_APP_VERSION=1.0.0
   ```

4. **커스텀 도메인 설정**
   - Pages → Custom domains
   - `app.your-domain.com` 추가

### 4단계: Cloudflare Zero Trust 설정

1. **Zero Trust 활성화**

   - Cloudflare 대시보드 → Zero Trust
   - Access → Applications → Add an application

2. **프론트엔드 앱 보호**

   ```
   Application name: Auto Shipping Frontend
   Subdomain: app
   Domain: your-domain.com
   Path: /*
   ```

3. **백엔드 API 보호**

   ```
   Application name: Auto Shipping API
   Subdomain: api
   Domain: your-domain.com
   Path: /*
   ```

4. **웹훅 엔드포인트 설정**
   - Service Auth 활성화
   - Service Token 생성
   - `/webhook/logiview` 경로만 Service Token 허용

### 5단계: 카페24 앱 설정

1. **개발자센터 앱 설정**

   ```
   Redirect URL: https://api.your-domain.com/oauth/callback
   Scope: mall.read_order mall.write_order
   ```

2. **OAuth 설치 URL 생성**
   ```bash
   # 브라우저에서 접속
   https://{mall_id}.cafe24api.com/api/v2/oauth/authorize
     ?response_type=code
     &client_id=YOUR_CLIENT_ID
     &redirect_uri=https%3A%2F%2Fapi.your-domain.com%2Foauth%2Fcallback
     &scope=mall.read_order%20mall.write_order
     &state=xyz
   ```

### 6단계: 로지뷰 웹훅 설정

1. **로지뷰 대시보드에서 웹훅 URL 설정**

   ```
   URL: https://api.your-domain.com/webhook/logiview
   Method: POST
   Headers:
     Cf-Access-Client-Id: your_cf_access_client_id
     Cf-Access-Client-Secret: your_cf_access_client_secret
   ```

2. **웹훅 테스트**
   ```bash
   curl -X POST https://api.your-domain.com/webhook/test \
     -H "Content-Type: application/json" \
     -H "Cf-Access-Client-Id: your_cf_access_client_id" \
     -H "Cf-Access-Client-Secret: your_cf_access_client_secret" \
     -d '{
       "order_id": "TEST-123",
       "tracking_no": "123456789012",
       "shipping_company_code": "kr.cjlogistics",
       "status": "shipping"
     }'
   ```

## 🔧 로컬 개발 환경 설정

### 백엔드 개발 서버 실행

```bash
cd server
npm install
cp env.example .env
# .env 파일 편집
npm run dev
```

### 프론트엔드 개발 서버 실행

```bash
cd web
npm install
cp env.example .env
# .env 파일 편집
npm run dev
```

## 📊 모니터링 및 로그

### Railway 로그 확인

```bash
railway logs
# 또는 Railway 대시보드에서 확인
```

### Cloudflare Analytics

- Pages → Analytics에서 프론트엔드 성능 확인
- Zero Trust → Analytics에서 접근 로그 확인

### Supabase 모니터링

- Database → Logs에서 쿼리 로그 확인
- API → Logs에서 API 호출 로그 확인

## 🚨 문제 해결

### 일반적인 문제들

1. **OAuth 토큰 만료**

   - 자동 갱신 로직이 구현되어 있음
   - 수동 갱신이 필요한 경우 `/oauth/install` 재실행

2. **웹훅 수신 실패**

   - Cloudflare Zero Trust Service Token 확인
   - 로지뷰에서 보내는 헤더 형식 확인

3. **CORS 오류**

   - `FRONTEND_URL` 환경변수 확인
   - Cloudflare Pages 도메인과 일치하는지 확인

4. **데이터베이스 연결 실패**
   - Supabase DATABASE_URL 확인
   - IP 허용 목록에 Railway IP 추가 (필요시)

### 로그 확인 방법

```bash
# Railway 로그
railway logs --tail

# Cloudflare Pages 빌드 로그
# Pages 대시보드에서 확인

# Supabase 로그
# Supabase 대시보드 → Logs에서 확인
```

## 🔄 업데이트 및 배포

### 자동 배포

- GitHub에 푸시하면 자동으로 배포됨
- Railway: `server` 폴더 변경 시
- Cloudflare Pages: `web` 폴더 변경 시

### 수동 배포

```bash
# Railway
railway up

# Cloudflare Pages
# Pages 대시보드에서 "Retry deployment" 클릭
```

## 📞 지원

문제가 발생하면 다음을 확인하세요:

1. 환경변수 설정이 올바른지
2. 도메인 DNS 설정이 완료되었는지
3. 각 서비스의 로그에서 오류 메시지 확인
4. 카페24 앱 권한이 올바른지

추가 도움이 필요하면 이슈를 생성해주세요.
