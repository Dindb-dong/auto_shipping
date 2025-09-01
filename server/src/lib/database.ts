import { Pool, PoolClient } from 'pg';
import { Cafe24TokenResponse } from './cafe24';

// 데이터베이스 연결 풀
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export { pool };

// OAuth 토큰 저장
export async function saveTokens(tokens: Cafe24TokenResponse): Promise<void> {
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
    `, ['cafe24', process.env.MALL_ID, tokens.access_token, tokens.refresh_token, expiresAt]);
  } finally {
    client.release();
  }
}

// 유효한 액세스 토큰 가져오기 (필요시 자동 갱신)
export async function getValidAccessToken(): Promise<string> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT access_token, refresh_token, expires_at
      FROM oauth_tokens 
      WHERE provider = $1 AND mall_id = $2
      ORDER BY updated_at DESC 
      LIMIT 1
    `, ['cafe24', process.env.MALL_ID]);

    if (result.rows.length === 0) {
      throw new Error('No OAuth tokens found. Please complete OAuth flow first.');
    }

    const { access_token, refresh_token, expires_at } = result.rows[0];

    // 토큰이 만료되었거나 5분 이내에 만료될 예정이면 갱신
    if (new Date().getTime() >= new Date(expires_at).getTime() - 5 * 60 * 1000) {
      console.log('Token expired or expiring soon, refreshing...');
      const { cafe24Client } = await import('./cafe24');
      const newTokens = await cafe24Client.refreshToken(refresh_token);
      await saveTokens(newTokens);
      return newTokens.access_token;
    }

    return access_token;
  } finally {
    client.release();
  }
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
