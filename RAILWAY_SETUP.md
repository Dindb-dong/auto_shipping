# Railway 배포 설정 가이드

## IPv6 데이터베이스 연결 문제 해결

Railway에서 PostgreSQL 데이터베이스(Supabase 포함)가 IPv6 주소를 사용할 때 발생하는 `ENETUNREACH` 에러를 해결하기 위한 설정입니다.

## 1. Railway 대시보드에서 환경변수 설정

### 필수 환경변수

```
NODE_ENV=production
PORT=3000

# 카페24 API 설정
MALL_ID=your_mall_id
CAFE24_CLIENT_ID=your_client_id
CAFE24_CLIENT_SECRET=your_client_secret
OAUTH_REDIRECT_URI=https://your-app.railway.app/oauth/callback

# 데이터베이스 설정 (IPv6 문제 해결용)
# Supabase 사용 시:
DATABASE_HOST=db.wsxsvvacpbpulbvbpxfc.supabase.co
DATABASE_PORT=5432
DATABASE_NAME=alushc-autoship
DATABASE_USER=postgres
DATABASE_PASSWORD=your_supabase_password

# Railway PostgreSQL 사용 시:
# DATABASE_HOST=postgres.railway.internal
# DATABASE_PORT=5432
# DATABASE_NAME=railway
# DATABASE_USER=postgres
# DATABASE_PASSWORD=your_postgres_password

# 기존 DATABASE_URL은 그대로 두세요 (자동 감지용)

# 로지뷰 웹훅 인증
PARTNER_API_KEY=your_partner_api_key

# 프론트엔드 URL
FRONTEND_URL=https://your-frontend.netlify.app

# 백엔드 URL
BACKEND_URL=https://your-app.railway.app

# 관리자 로그인 설정
ADMIN_USER=admin
ADMIN_PASS=your_secure_password
```

## 2. 데이터베이스 정보 확인

### Supabase 사용 시:

1. **Supabase 대시보드** → **Settings** → **Database**
2. **Connection string** 섹션에서 다음 정보 확인:
   - Host: `db.wsxsvvacpbpulbvbpxfc.supabase.co`
   - Port: `5432`
   - Database: `alushc-autoship`
   - User: `postgres`
   - Password: 프로젝트 설정에서 확인

### Railway PostgreSQL 사용 시:

1. **Railway 대시보드** → **PostgreSQL 서비스 클릭**
2. **Variables 탭에서 다음 정보 확인**:

   - `PGHOST` (호스트명)
   - `PGPORT` (포트)
   - `PGDATABASE` (데이터베이스명)
   - `PGUSER` (사용자명)
   - `PGPASSWORD` (비밀번호)

3. **이 정보를 위의 환경변수에 설정**

## 3. IPv6 문제 해결 방법

### 방법 1: 개별 환경변수 사용 (권장)

위의 개별 데이터베이스 환경변수를 모두 설정하면 IPv6 문제를 우회할 수 있습니다.

### 방법 2: Railway 내부 호스트명 사용

Railway의 PostgreSQL은 내부적으로 `postgres.railway.internal` 호스트명을 사용할 수 있습니다.

### 방법 3: IPv4 우선 설정

Railway에서 PostgreSQL 서비스를 IPv4로 설정할 수 있는지 확인하세요.

## 4. 배포 후 확인사항

### 로그 확인

배포 후 Railway 로그에서 다음 메시지를 확인하세요:

```
🔍 Database configuration debug:
DATABASE_URL: Set
DATABASE_HOST: postgres.railway.internal
✅ Using individual database environment variables
✅ Database connection successful
```

### 헬스체크 확인

```bash
curl https://your-app.railway.app/health
```

응답 예시:

```json
{
  "status": "ok",
  "timestamp": "2025-01-04T18:50:00.000Z",
  "version": "1.0.0",
  "database": "connected"
}
```

## 5. 문제 해결

### 여전히 IPv6 에러가 발생하는 경우

1. **Railway PostgreSQL 서비스 재시작**
2. **환경변수 재설정 후 재배포**
3. **Railway 지원팀에 IPv4 설정 요청**

### 연결 타임아웃 에러

- `DATABASE_HOST`를 `localhost`로 시도
- Railway의 내부 네트워크 설정 확인

## 6. 추가 설정

### SSL 설정

프로덕션 환경에서는 SSL이 자동으로 활성화됩니다.

### 연결 풀 설정

- 최대 연결 수: 10
- 연결 타임아웃: 10초
- 유휴 타임아웃: 30초
