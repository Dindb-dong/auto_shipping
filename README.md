# Auto Shipping - 로지뷰 물류 발송 대행 시스템

## 📋 개요

본 시스템은 물류 및 발송 대행 업체 "로지뷰"와의 원활한 업무를 위해 개발된 웹 애플리케이션입니다. 카페24의 웹훅을 활용하여 회사 업무 자동화를 구현했습니다.

## 🚀 주요 기능

### 1. 주문 목록 조회

- **조회 기간**: 전체, 월별, 일별, 주별 조회
- **정렬 기능**: 날짜 오름차순/내림차순
- **필터 기능**: 권역별, 배송 단계별 필터링

### 2. 송장번호 관리

- **송장번호 입력**: 주문 목록의 각 행마다 송장번호 입력 필드 제공
  - 중복 번호 검증 및 경고
  - 빈 값 입력 방지
- **송장번호 수정**: 기존 송장번호 수정 기능 (PUT 처리)

## 🔄 업무 플로우

### 송장번호 입력 프로세스

1. 전용 계정으로 로그인 (refresh 토큰 2주, access 토큰 2시간 유효)
2. 대시보드 접속
3. 배송준비중인 주문 목록 조회
4. 각 행에 송장번호 입력
5. 전체 저장 (자동으로 배송 상태 '배송중'으로 변경)

### 송장번호 수정 프로세스

1. 전용 계정으로 로그인
2. 대시보드 접속
3. 배송중인 주문 목록 조회
4. 특정 행의 송장번호 수정
5. 전체 저장

## 🛠 구현 기능

### 1. 로그인 시스템

- **카페24 연동**: 본 사이트 로그인 시 카페24 API로 토큰 확인
- **토큰 관리**: 카페24에서 발급받은 토큰을 DB에 저장
- **로그 기록**: 로그인 시 IP, 접속위치, 시간을 DB에 저장
- **로컬 스토리지**: 토큰 정보를 로컬스토리지에 저장

### 2. 주문 목록 조회

- **필터링 설정**: 조회 전 필터링 옵션 제공
  - 날짜별 (주별, 일별)
  - 권역별
  - 배송 단계별
- **엑셀 스타일 UI**:
  - 열 구성: 주문번호, 배송지역, 주문일시 등
  - 행 구성: 개별 주문 아이템
  - 정렬 기능: 각 열 클릭 시 내림차순/오름차순 (기본 내림차순)

### 3. 배송 정보 수정

- **신규 송장번호 입력**: 송장번호가 비어있는 경우 POST 처리
- **송장번호 수정**: 기존 송장번호가 있는 경우 PUT 처리
- **API 연동**: 카페24 API를 통한 실시간 데이터 동기화

## 🔧 기술 스택

- **프론트엔드**: React.js + Vite
- **백엔드**: Node.js + Express.js
- **데이터베이스**: Supabase (PostgreSQL)
- **배포**: Railway (백엔드) + Netlify (프론트엔드)
- **API 연동**: 카페24 API
- **인증**: JWT 토큰 기반 인증

## 📦 설치 및 실행

### 빠른 시작

```bash
# 저장소 클론
git clone [repository-url]
cd auto_shipping

# 자동 설정 스크립트 실행
./scripts/setup.sh

# 개발 서버 실행 (백엔드 + 프론트엔드)
./scripts/quick-start.sh
```

### 수동 설정

```bash
# 백엔드 설정
cd server
npm install
cp env.example .env
# .env 파일 편집
npm run dev

# 프론트엔드 설정 (새 터미널)
cd web
npm install
cp env.example .env
# .env 파일 편집
npm run dev
```

### Docker 사용 (백엔드)

```bash
# Docker 이미지 빌드
cd server
npm run docker:build

# Docker 컨테이너 실행
npm run docker:run
```

### 프로덕션 빌드

```bash
# 백엔드 빌드
cd server
npm run build

# 프론트엔드 빌드
cd web
npm run build
```

## 📝 API 문서

### OAuth API

- `GET /oauth/install` - OAuth 설치 URL 생성
- `GET /oauth/callback` - OAuth 콜백 처리
- `GET /oauth/status` - OAuth 상태 확인

### 주문 API

- `GET /api/orders` - 주문 목록 조회
- `GET /api/orders/:id` - 특정 주문 상세 조회
- `GET /api/orders/:id/shipments` - 주문의 배송 로그 조회
- `GET /api/orders/stats/summary` - 주문 통계 조회

### 웹훅 API

- `POST /webhook/logiview` - 로지뷰 웹훅 수신
- `POST /webhook/test` - 웹훅 테스트
- `GET /webhook/status` - 웹훅 상태 확인

### 헬스체크

- `GET /health` - 서버 상태 확인

## 🚀 배포

### 프로덕션 배포

이 시스템은 다음 플랫폼에 배포됩니다:

- **백엔드**: Railway (Express.js)
- **프론트엔드**: Netlify (React)
- **데이터베이스**: Supabase (PostgreSQL)
- **접근제어**: Cloudflare Zero Trust

자세한 배포 방법은 [DEPLOYMENT.md](./DEPLOYMENT.md)를 참조하세요.

### 빠른 배포 명령어

```bash
# 1. Supabase 프로젝트 생성 및 스키마 적용
# Supabase 대시보드에서 server/supabase-schema.sql 실행

# 2. Railway에 백엔드 배포
# Railway 대시보드에서 GitHub 리포지토리 연결 (server 폴더)

# 3. Netlify에 프론트엔드 배포
# Netlify에서 GitHub 리포지토리 연결 (web 폴더)

# 4. 도메인 및 Zero Trust 설정
# DEPLOYMENT.md 참조
```

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해 주세요.

e-mail: dwkim@alus.kr

---

**개발팀** - 로지뷰 물류 발송 대행 시스템
