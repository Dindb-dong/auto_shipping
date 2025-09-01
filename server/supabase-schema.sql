-- Auto Shipping System Database Schema
-- Supabase PostgreSQL Database

-- OAuth 토큰 테이블
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'cafe24',
  mall_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 유니크 제약조건: 같은 provider와 mall_id 조합은 하나만 존재
  CONSTRAINT uniq_provider_mall UNIQUE (provider, mall_id)
);

-- 배송 로그 테이블
CREATE TABLE IF NOT EXISTS shipment_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id TEXT NOT NULL,
  tracking_no TEXT NOT NULL,
  shipping_company_code TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('shipping', 'delivered', 'returned', 'error')),
  payload JSONB,
  cafe24_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 유니크 제약조건: 같은 주문에 같은 송장번호는 하나만 존재
  CONSTRAINT uniq_order_tracking UNIQUE (order_id, tracking_no)
);

-- 로그인 로그 테이블
CREATE TABLE IF NOT EXISTS login_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip INET NOT NULL,
  user_agent TEXT,
  location TEXT,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_mall_id ON oauth_tokens(mall_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires_at ON oauth_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_shipment_logs_order_id ON shipment_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_shipment_logs_tracking_no ON shipment_logs(tracking_no);
CREATE INDEX IF NOT EXISTS idx_shipment_logs_created_at ON shipment_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_shipment_logs_status ON shipment_logs(status);
CREATE INDEX IF NOT EXISTS idx_login_logs_ip ON login_logs(ip);
CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON login_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_login_logs_success ON login_logs(success);

-- RLS (Row Level Security) 비활성화 (이 시스템에서는 필요하지 않음)
ALTER TABLE oauth_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE login_logs DISABLE ROW LEVEL SECURITY;

-- 업데이트 시간 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- OAuth 토큰 테이블의 updated_at 자동 갱신 트리거
CREATE TRIGGER update_oauth_tokens_updated_at 
    BEFORE UPDATE ON oauth_tokens 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 샘플 데이터 삽입 (개발용)
-- INSERT INTO oauth_tokens (provider, mall_id, access_token, refresh_token, expires_at) 
-- VALUES ('cafe24', 'test_mall', 'sample_access_token', 'sample_refresh_token', NOW() + INTERVAL '2 hours');

-- 뷰 생성: 최근 배송 로그 요약
CREATE OR REPLACE VIEW recent_shipments AS
SELECT 
    order_id,
    tracking_no,
    shipping_company_code,
    status,
    created_at,
    CASE 
        WHEN status = 'shipping' THEN '배송중'
        WHEN status = 'delivered' THEN '배송완료'
        WHEN status = 'returned' THEN '반품'
        WHEN status = 'error' THEN '오류'
        ELSE status
    END as status_korean
FROM shipment_logs
ORDER BY created_at DESC
LIMIT 100;

-- 뷰 생성: 일별 배송 통계
CREATE OR REPLACE VIEW daily_shipment_stats AS
SELECT 
    DATE(created_at) as shipment_date,
    COUNT(*) as total_shipments,
    COUNT(CASE WHEN status = 'shipping' THEN 1 END) as shipping_count,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count,
    COUNT(CASE WHEN status = 'returned' THEN 1 END) as returned_count,
    COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count
FROM shipment_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY shipment_date DESC;

-- 뷰 생성: 배송사별 통계
CREATE OR REPLACE VIEW shipping_company_stats AS
SELECT 
    shipping_company_code,
    COUNT(*) as total_shipments,
    COUNT(CASE WHEN status = 'shipping' THEN 1 END) as shipping_count,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count,
    COUNT(CASE WHEN status = 'returned' THEN 1 END) as returned_count,
    COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count,
    ROUND(
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) * 100.0 / COUNT(*), 
        2
    ) as delivery_success_rate
FROM shipment_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY shipping_company_code
ORDER BY total_shipments DESC;

-- 권한 설정 (필요시)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;
