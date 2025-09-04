#!/usr/bin/env node

/**
 * 타임스탬프 생성 테스트 스크립트
 * 
 * 이 스크립트는 다양한 expires_in 값에 대해 타임스탬프가 올바르게 생성되는지 테스트합니다.
 */

// 테스트 케이스들
const testCases = [
  { expires_in: 3600, description: '정상적인 숫자 (1시간)' },
  { expires_in: '3600', description: '문자열 숫자 (1시간)' },
  { expires_in: 0, description: '0 값' },
  { expires_in: -1, description: '음수' },
  { expires_in: 'invalid', description: '유효하지 않은 문자열' },
  { expires_in: null, description: 'null 값' },
  { expires_in: undefined, description: 'undefined 값' },
  { expires_in: NaN, description: 'NaN 값' },
  { expires_in: Infinity, description: 'Infinity 값' },
];

function testTimestampGeneration(expiresIn, description) {
  console.log(`\n🧪 테스트: ${description}`);
  console.log(`   입력값: ${expiresIn} (타입: ${typeof expiresIn})`);
  
  // 검증 로직 (database.ts와 동일)
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

  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  const isValid = !isNaN(expiresAt.getTime());
  
  console.log(`   계산된 초: ${expiresInSeconds}`);
  console.log(`   만료 시간: ${expiresAt.toISOString()}`);
  console.log(`   유효한 날짜: ${isValid ? '✅' : '❌'}`);
  
  if (!isValid) {
    console.log(`   ❌ 오류: 유효하지 않은 날짜가 생성됨`);
  }
  
  return isValid;
}

console.log('🔍 타임스탬프 생성 테스트 시작...\n');

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  const isValid = testTimestampGeneration(testCase.expires_in, testCase.description);
  if (isValid) {
    passedTests++;
  }
});

console.log(`\n📊 테스트 결과:`);
console.log(`   통과: ${passedTests}/${totalTests}`);
console.log(`   실패: ${totalTests - passedTests}/${totalTests}`);

if (passedTests === totalTests) {
  console.log('✅ 모든 테스트 통과!');
} else {
  console.log('❌ 일부 테스트 실패');
  process.exit(1);
}
