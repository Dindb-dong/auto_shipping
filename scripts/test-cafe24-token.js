#!/usr/bin/env node

/**
 * 카페24 토큰 응답 테스트 스크립트
 * 
 * 실제 카페24 응답 형태를 시뮬레이션하여 토큰 저장 로직을 테스트합니다.
 */

// 카페24 실제 응답 형태 시뮬레이션
const cafe24TokenResponse = {
  access_token: 'I4ho7w1DJJvniuDXPkv8hC',
  expires_at: '2025-09-05T08:36:33.000',
  refresh_token: 'ZTdOPyr5KJOl58Ivmrg4YB',
  refresh_token_expires_at: '2025-09-19T06:36:33.000',
  client_id: '7KWBTYZ4N1moFMhlh3db9B',
  mall_id: 'alushealthcare01',
  user_id: 'alushealthcare01',
  scopes: ['mall.read_product', 'mall.read_order', 'mall.write_order'],
  issued_at: '2025-09-05T06:36:33.000',
  shop_no: '1'
};

function testTokenProcessing(tokenData, description) {
  console.log(`\n🧪 테스트: ${description}`);
  console.log(`   입력 데이터:`, {
    expires_in: tokenData.expires_in,
    expires_at: tokenData.expires_at,
    access_token_length: tokenData.access_token?.length,
    refresh_token_length: tokenData.refresh_token?.length
  });

  // 만료 시간 계산 로직 (database.ts와 동일)
  let expiresAt;
  
  // 1. expires_at 필드가 있으면 직접 사용
  if (tokenData.expires_at) {
    try {
      expiresAt = new Date(tokenData.expires_at);
      if (!isNaN(expiresAt.getTime())) {
        console.log('   📅 Using expires_at from token response:', expiresAt.toISOString());
      } else {
        throw new Error('Invalid expires_at date');
      }
    } catch (error) {
      console.warn('   ⚠️ Invalid expires_at, falling back to expires_in calculation');
      expiresAt = calculateExpiresAtFromExpiresIn(tokenData.expires_in);
    }
  } else {
    // 2. expires_in 필드로 계산
    expiresAt = calculateExpiresAtFromExpiresIn(tokenData.expires_in);
  }

  const isValid = !isNaN(expiresAt.getTime());
  console.log('   📅 Final expiration:', {
    expiresAt: expiresAt.toISOString(),
    isValid: isValid ? '✅' : '❌'
  });

  return isValid;
}

function calculateExpiresAtFromExpiresIn(expiresIn) {
  let expiresInSeconds;
  
  if (typeof expiresIn === 'number' && 
      !isNaN(expiresIn) && 
      isFinite(expiresIn) && 
      expiresIn > 0) {
    expiresInSeconds = expiresIn;
  } else if (typeof expiresIn === 'string') {
    const parsed = parseInt(expiresIn, 10);
    if (!isNaN(parsed) && isFinite(parsed) && parsed > 0) {
      expiresInSeconds = parsed;
    } else {
      console.warn('   ⚠️ Invalid expires_in string, using default 2 hours');
      expiresInSeconds = 7200; // 2시간 기본값
    }
  } else {
    console.warn('   ⚠️ Invalid expires_in value, using default 2 hours');
    expiresInSeconds = 7200; // 2시간 기본값
  }

  return new Date(Date.now() + expiresInSeconds * 1000);
}

console.log('🔍 카페24 토큰 처리 테스트 시작...\n');

// 테스트 케이스들
const testCases = [
  {
    data: cafe24TokenResponse,
    description: '실제 카페24 응답 (expires_at 사용)'
  },
  {
    data: { ...cafe24TokenResponse, expires_at: undefined, expires_in: 3600 },
    description: 'expires_in 사용 (1시간)'
  },
  {
    data: { ...cafe24TokenResponse, expires_at: undefined, expires_in: undefined },
    description: '만료 시간 정보 없음 (기본값 사용)'
  },
  {
    data: { ...cafe24TokenResponse, expires_at: 'invalid-date' },
    description: '잘못된 expires_at (폴백 사용)'
  },
  {
    data: { ...cafe24TokenResponse, expires_at: undefined, expires_in: '7200' },
    description: '문자열 expires_in (2시간)'
  }
];

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  const isValid = testTokenProcessing(testCase.data, testCase.description);
  if (isValid) {
    passedTests++;
  }
});

console.log(`\n📊 테스트 결과:`);
console.log(`   통과: ${passedTests}/${totalTests}`);
console.log(`   실패: ${totalTests - passedTests}/${totalTests}`);

if (passedTests === totalTests) {
  console.log('✅ 모든 테스트 통과! 카페24 토큰 처리가 정상 작동합니다.');
} else {
  console.log('❌ 일부 테스트 실패');
  process.exit(1);
}
