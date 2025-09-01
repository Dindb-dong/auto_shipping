#!/bin/bash

# Auto Shipping 빠른 시작 스크립트
# 로컬 개발 환경에서 백엔드와 프론트엔드를 동시에 실행합니다.

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 환경변수 파일 확인
check_env_files() {
    if [ ! -f "server/.env" ]; then
        print_error "server/.env 파일이 없습니다. scripts/setup.sh를 먼저 실행하세요."
        exit 1
    fi
    
    if [ ! -f "web/.env" ]; then
        print_error "web/.env 파일이 없습니다. scripts/setup.sh를 먼저 실행하세요."
        exit 1
    fi
}

# 백그라운드 프로세스 정리 함수
cleanup() {
    print_step "프로세스 정리 중..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    exit 0
}

# 시그널 핸들러 설정
trap cleanup SIGINT SIGTERM

print_step "Auto Shipping 개발 서버 시작"
echo

# 환경변수 파일 확인
check_env_files

# 백엔드 서버 시작
print_step "백엔드 서버 시작 (포트 3000)"
cd server
npm run dev &
BACKEND_PID=$!
cd ..

# 잠시 대기
sleep 3

# 프론트엔드 서버 시작
print_step "프론트엔드 서버 시작 (포트 5173)"
cd web
npm run dev &
FRONTEND_PID=$!
cd ..

# 서버 시작 대기
sleep 5

print_success "개발 서버가 시작되었습니다!"
echo
echo "🌐 애플리케이션 URL:"
echo "   프론트엔드: http://localhost:5173"
echo "   백엔드 API: http://localhost:3000"
echo "   헬스체크: http://localhost:3000/health"
echo
echo "📚 유용한 엔드포인트:"
echo "   OAuth 설치: http://localhost:3000/oauth/install"
echo "   웹훅 테스트: http://localhost:3000/webhook/test"
echo "   API 문서: http://localhost:3000/api/orders"
echo
echo "🛑 서버를 중지하려면 Ctrl+C를 누르세요."
echo

# 프로세스 모니터링
while true; do
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        print_error "백엔드 서버가 중지되었습니다."
        cleanup
    fi
    
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        print_error "프론트엔드 서버가 중지되었습니다."
        cleanup
    fi
    
    sleep 5
done
