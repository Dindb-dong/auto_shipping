import { Pool, PoolClient } from 'pg';
import { Cafe24TokenResponse } from './cafe24';

// 데이터베이스 연결 풀 설정
const getDatabaseConfig = () => {
  console.log('🔍 Database configuration debug:');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  console.log('DATABASE_HOST:', process.env.DATABASE_HOST || 'Not set');
  console.log('DATABASE_PORT:', process.env.DATABASE_PORT || 'Not set');
  console.log('DATABASE_NAME:', process.env.DATABASE_NAME || 'Not set');
  console.log('DATABASE_USER:', process.env.DATABASE_USER || 'Not set');
  console.log('DATABASE_PASSWORD:', process.env.DATABASE_PASSWORD ? 'Set' : 'Not set');

  // 개별 환경변수가 모두 설정되어 있으면 우선 사용 (DATABASE_URL 무시)
  if (process.env.DATABASE_HOST && process.env.DATABASE_NAME && process.env.DATABASE_USER && process.env.DATABASE_PASSWORD) {
    console.log('✅ Using individual database environment variables (ignoring DATABASE_URL)');
    console.log('🔍 Connection details:');
    console.log('  Host:', process.env.DATABASE_HOST);
    console.log('  Port:', process.env.DATABASE_PORT || '5432');
    console.log('  Database:', process.env.DATABASE_NAME);
    console.log('  User:', process.env.DATABASE_USER);

    // Supabase 연결 설정
    const isSupabase = process.env.DATABASE_HOST && process.env.DATABASE_HOST.includes('supabase.co');
    let finalHost = process.env.DATABASE_HOST;
    let finalPort = parseInt(process.env.DATABASE_PORT || '5432');

    if (isSupabase) {
      console.log('🔒 Using Supabase configuration');

      // Supabase Transaction pooler 사용 (IPv4 주소, 포트 6543)
      if (process.env.DATABASE_HOST.includes('supabase.co')) {
        // Transaction pooler 호스트명이 이미 설정되어 있으면 사용
        if (process.env.DATABASE_HOST.includes('pooler.supabase.com')) {
          finalHost = process.env.DATABASE_HOST;
          finalPort = 6543; // Transaction pooler 포트
          console.log('🔄 Using configured Supabase Transaction pooler (IPv4)');
          console.log('  Pooler Host:', finalHost);
          console.log('  Pooler Port:', finalPort);
        } else {
          // Direct connection을 Transaction pooler로 변환
          finalHost = process.env.DATABASE_HOST.replace('db.', 'aws-1-ap-northeast-2.pooler.');
          finalPort = 6543; // Transaction pooler 포트
          console.log('🔄 Converting to Supabase Transaction pooler (IPv4)');
          console.log('  Original Host:', process.env.DATABASE_HOST);
          console.log('  Pooler Host:', finalHost);
          console.log('  Pooler Port:', finalPort);
        }
      }
    }

    const sslConfig = isSupabase
      ? { rejectUnauthorized: false } // Supabase는 SSL 필수
      : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false);

    return {
      host: finalHost,
      port: finalPort,
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      ssl: sslConfig,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 10,
    };
  }

  // DATABASE_URL이 있으면 파싱해서 사용
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      console.log('🔍 Parsed DATABASE_URL hostname:', url.hostname);

      // IPv6 주소 감지 (콜론이 포함된 경우)
      if (url.hostname.includes(':')) {
        console.log('⚠️ IPv6 database URL detected, attempting to use IPv4 alternative');

        // Railway PostgreSQL의 IPv4 호스트명 패턴 시도
        let ipv4Host = url.hostname;

        // IPv6 주소를 IPv4로 매핑
        if (url.hostname.includes('2406:da12:b78:de00:bf62:bc3a:a608:f3ab')) {
          // 이 특정 IPv6 주소는 Supabase 또는 Railway의 IPv6 주소
          // Supabase 호스트명이 설정되어 있으면 사용, 없으면 Railway 내부 호스트명 사용
          if (process.env.DATABASE_HOST && process.env.DATABASE_HOST.includes('supabase.co')) {
            ipv4Host = process.env.DATABASE_HOST;
            console.log('🔄 Using Supabase IPv4 host from DATABASE_HOST:', ipv4Host);
          } else {
            ipv4Host = 'postgres.railway.internal';
            console.log('🔄 Using Railway internal host:', ipv4Host);
          }
        } else if (url.hostname.includes('.railway.app')) {
          // 일반적인 Railway 도메인을 내부 호스트명으로 변환
          ipv4Host = url.hostname.replace(/^.*\.railway\.app$/, 'postgres.railway.internal');
        } else if (url.hostname.includes('.supabase.co')) {
          // Supabase 도메인인 경우 그대로 사용 (이미 IPv4)
          ipv4Host = url.hostname;
        } else {
          // 다른 IPv6 주소의 경우 localhost로 시도
          ipv4Host = 'localhost';
        }

        console.log('🔄 Trying IPv4 host:', ipv4Host);

        return {
          host: ipv4Host,
          port: parseInt(url.port || '5432'),
          database: url.pathname.slice(1),
          user: url.username,
          password: url.password,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000,
          max: 10,
        };
      } else {
        console.log('✅ Using IPv4 DATABASE_URL');
        return {
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
          connectionTimeoutMillis: 10000,
          idleTimeoutMillis: 30000,
          max: 10,
        };
      }
    } catch (error) {
      console.error('❌ Error parsing DATABASE_URL:', error);
    }
  }

  // 기본 설정 (개별 환경변수 사용)
  console.log('⚠️ Using fallback database configuration');
  return {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: process.env.DATABASE_NAME || 'auto_shipping',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || '',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10,
  };
};

const pool = new Pool(getDatabaseConfig());

// 연결 에러 처리
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// 연결 테스트 함수 (재시도 로직 포함)
export async function testDatabaseConnection(retries: number = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Database connection attempt ${attempt}/${retries}`);
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✅ Database connection successful');
      return true;
    } catch (error: any) {
      console.error(`❌ Database connection attempt ${attempt} failed:`, error.message);

      if (error.code === 'ENETUNREACH' && attempt < retries) {
        console.log(`⏳ Waiting 2 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      if (attempt === retries) {
        console.error('❌ All database connection attempts failed');
        return false;
      }
    }
  }
  return false;
}

export { pool };

// OAuth 토큰 저장 (특정 몰)
export async function saveTokensForMall(mallId: string, tokens: Cafe24TokenResponse): Promise<void> {
  const client = await pool.connect();
  try {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await client.query(`
      INSERT INTO oauth_tokens (provider, mall_id, access_token, refresh_token, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (provider, mall_id) 
      DO UPDATE SET 
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW()
    `, ['cafe24', mallId, tokens.access_token, tokens.refresh_token, expiresAt]);
  } finally {
    client.release();
  }
}

// OAuth 토큰 저장 (기존 함수 - 호환성을 위해 유지)
export async function saveTokens(tokens: Cafe24TokenResponse): Promise<void> {
  const mallId = process.env.MALL_ID;
  if (!mallId) {
    throw new Error('MALL_ID environment variable is required');
  }
  return saveTokensForMall(mallId, tokens);
}

// 특정 몰의 토큰 정보 가져오기
export async function getTokensForMall(mallId: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_at: string;
} | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT access_token, refresh_token, expires_at
      FROM oauth_tokens 
      WHERE provider = $1 AND mall_id = $2
      ORDER BY updated_at DESC 
      LIMIT 1
    `, ['cafe24', mallId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } finally {
    client.release();
  }
}

// 유효한 액세스 토큰 가져오기 (특정 몰)
export async function getValidAccessTokenForMall(mallId: string): Promise<string> {
  const tokens = await getTokensForMall(mallId);

  if (!tokens) {
    throw new Error(`No OAuth tokens found for mall: ${mallId}. Please complete OAuth flow first.`);
  }

  // 토큰이 만료되었거나 5분 이내에 만료될 예정이면 갱신
  if (new Date().getTime() >= new Date(tokens.expires_at).getTime() - 5 * 60 * 1000) {
    console.log(`Token expired or expiring soon for mall: ${mallId}, refreshing...`);
    const newTokens = await refreshCafe24Token(mallId);
    return newTokens.access_token;
  }

  return tokens.access_token;
}

// 유효한 액세스 토큰 가져오기 (기존 함수 - 호환성을 위해 유지)
export async function getValidAccessToken(): Promise<string> {
  const mallId = process.env.MALL_ID;
  if (!mallId) {
    throw new Error('MALL_ID environment variable is required');
  }
  return getValidAccessTokenForMall(mallId);
}

// 카페24 토큰 갱신
export async function refreshCafe24Token(mallId: string): Promise<Cafe24TokenResponse> {
  const tokens = await getTokensForMall(mallId);
  if (!tokens || !tokens.refresh_token) {
    throw new Error(`No refresh token found for mall: ${mallId}`);
  }

  const { cafe24Client } = await import('./cafe24');
  const newTokens = await cafe24Client.refreshToken(mallId, tokens.refresh_token);
  await saveTokensForMall(mallId, newTokens);

  return newTokens;
}

// 배송 로그 저장
export async function saveShipmentLog(logData: {
  order_id: string;
  tracking_no: string;
  shipping_company_code: string;
  status: string;
  payload?: any;
  cafe24_response?: any;
}): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      INSERT INTO shipment_logs (order_id, tracking_no, shipping_company_code, status, payload, cafe24_response)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (order_id, tracking_no) 
      DO UPDATE SET 
        shipping_company_code = EXCLUDED.shipping_company_code,
        status = EXCLUDED.status,
        payload = EXCLUDED.payload,
        cafe24_response = EXCLUDED.cafe24_response,
        created_at = NOW()
    `, [
      logData.order_id,
      logData.tracking_no,
      logData.shipping_company_code,
      logData.status,
      JSON.stringify(logData.payload),
      JSON.stringify(logData.cafe24_response)
    ]);
  } finally {
    client.release();
  }
}

// 배송 로그 조회
export async function getShipmentLogs(params: {
  order_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const client = await pool.connect();
  try {
    let query = 'SELECT * FROM shipment_logs WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (params.order_id) {
      query += ` AND order_id = $${paramIndex}`;
      values.push(params.order_id);
      paramIndex++;
    }

    if (params.start_date) {
      query += ` AND created_at >= $${paramIndex}`;
      values.push(params.start_date);
      paramIndex++;
    }

    if (params.end_date) {
      query += ` AND created_at <= $${paramIndex}`;
      values.push(params.end_date);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    if (params.limit) {
      query += ` LIMIT $${paramIndex}`;
      values.push(params.limit);
      paramIndex++;
    }

    if (params.offset) {
      query += ` OFFSET $${paramIndex}`;
      values.push(params.offset);
      paramIndex++;
    }

    const result = await client.query(query, values);
    return result.rows;
  } finally {
    client.release();
  }
}

// 로그인 로그 저장
export async function saveLoginLog(logData: {
  ip: string;
  user_agent?: string;
  location?: string;
  success: boolean;
  error_message?: string;
}): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      INSERT INTO login_logs (ip, user_agent, location, success, error_message)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      logData.ip,
      logData.user_agent,
      logData.location,
      logData.success,
      logData.error_message
    ]);
  } finally {
    client.release();
  }
}
