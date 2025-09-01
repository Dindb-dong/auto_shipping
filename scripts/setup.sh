#!/bin/bash

# Auto Shipping 시스템 설정 스크립트
# 이 스크립트는 로컬 개발 환경을 설정합니다.

set -e

echo "🚀 Auto Shipping 시스템 설정을 시작합니다..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 함수 정의
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

# Node.js 버전 확인
print_step "Node.js 버전 확인"
if ! command -v node &> /dev/null; then
    print_error "Node.js가 설치되지 않았습니다. Node.js 18 이상을 설치해주세요."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js 18 이상이 필요합니다. 현재 버전: $(node -v)"
    exit 1
fi

print_success "Node.js 버전: $(node -v)"

# 백엔드 설정
print_step "백엔드 서버 설정"
cd server

if [ ! -f "package.json" ]; then
    print_error "server/package.json 파일을 찾을 수 없습니다."
    exit 1
fi

print_step "백엔드 의존성 설치"
npm install

if [ ! -f ".env" ]; then
    print_step "환경변수 파일 생성"
    cp env.example .env
    print_warning "server/.env 파일을 편집하여 환경변수를 설정해주세요."
else
    print_success "환경변수 파일이 이미 존재합니다."
fi

cd ..

# 프론트엔드 설정
print_step "프론트엔드 설정"
cd web

if [ ! -f "package.json" ]; then
    print_error "web/package.json 파일을 찾을 수 없습니다."
    exit 1
fi

print_step "프론트엔드 의존성 설치"
npm install

if [ ! -f ".env" ]; then
    print_step "환경변수 파일 생성"
    cp env.example .env
    print_warning "web/.env 파일을 편집하여 환경변수를 설정해주세요."
else
    print_success "환경변수 파일이 이미 존재합니다."
fi

cd ..

# Git 설정 확인
print_step "Git 설정 확인"
if [ ! -d ".git" ]; then
    print_warning "Git 저장소가 초기화되지 않았습니다."
    read -p "Git 저장소를 초기화하시겠습니까? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git init
        git add .
        git commit -m "Initial commit: Auto Shipping system setup"
        print_success "Git 저장소가 초기화되었습니다."
    fi
else
    print_success "Git 저장소가 이미 설정되어 있습니다."
fi

# 설정 완료
print_success "설정이 완료되었습니다!"
echo
echo "다음 단계를 진행하세요:"
echo
echo "1. 환경변수 설정:"
echo "   - server/.env 파일 편집"
echo "   - web/.env 파일 편집"
echo
echo "2. 개발 서버 실행:"
echo "   백엔드: cd server && npm run dev"
echo "   프론트엔드: cd web && npm run dev"
echo
echo "3. 배포 준비:"
echo "   - DEPLOYMENT.md 파일 참조"
echo "   - Supabase 프로젝트 생성"
echo "   - Railway 및 Cloudflare Pages 설정"
echo
echo "📚 자세한 내용은 README.md와 DEPLOYMENT.md를 참조하세요."
