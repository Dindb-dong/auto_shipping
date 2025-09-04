import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { saveTokensForMall, getTokensForMall, refreshCafe24Token, saveLoginLog } from '../lib/database';
import { Cafe24TokenResponse } from '../lib/cafe24';

const router = Router();

// OAuth 설치 시작 엔드포인트
router.get('/install', (req: Request, res: Response) => {
  const mallId = String(req.query.mall_id || '').trim();

  if (!mallId) {
    return res.status(400).send(`
      <html>
        <body>
          <h1>Mall ID Required</h1>
          <p>mall_id parameter is required.</p>
          <p>Usage: /oauth/install?mall_id=your_mall_id</p>
        </body>
      </html>
    `);
  }

  const clientId = process.env.CAFE24_CLIENT_ID;
  const backendUrl = process.env.BACKEND_URL;

  if (!clientId || !backendUrl) {
    return res.status(500).send(`
      <html>
        <body>
          <h1>Configuration Error</h1>
          <p>OAuth configuration missing. Please check environment variables.</p>
        </body>
      </html>
    `);
  }

  // CSRF 방지를 위한 state 생성
  const state = crypto.randomBytes(16).toString('hex');

  // 필요한 스코프 설정
  const scope = [
    'mall.read_product',
    'mall.read_order',
    'mall.write_order'
  ].join(' ');

  // 카페24 권한동의 URL 생성
  const authorizeUrl = new URL(`https://${mallId}.cafe24api.com/api/v2/oauth/authorize`);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', `${backendUrl}/oauth/callback`);
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('scope', scope);

  // state를 세션에 저장 (실제로는 DB나 Redis에 저장하는 것이 좋음)
  // 여기서는 간단히 쿠키에 저장
  res.cookie('oauth_state', JSON.stringify({ state, mallId }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000 // 10분
  });

  console.log(`Redirecting to OAuth for mall: ${mallId}`);
  res.redirect(authorizeUrl.toString());
});

// OAuth 콜백 처리
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, mall_id: cbMallId } = req.query as {
      code: string;
      state: string;
      mall_id?: string;
    };

    // state 검증
    const savedStateCookie = req.cookies.oauth_state;
    if (!savedStateCookie) {
      return res.status(400).send(`
        <html>
          <body>
            <h1>Invalid Request</h1>
            <p>OAuth state not found. Please try again.</p>
          </body>
        </html>
      `);
    }

    const savedState = JSON.parse(savedStateCookie);
    if (savedState.state !== state) {
      return res.status(400).send(`
        <html>
          <body>
            <h1>Invalid State</h1>
            <p>OAuth state mismatch. Please try again.</p>
          </body>
        </html>
      `);
    }

    const mallId = cbMallId || savedState.mallId;
    const clientId = process.env.CAFE24_CLIENT_ID;
    const clientSecret = process.env.CAFE24_CLIENT_SECRET;
    const backendUrl = process.env.BACKEND_URL;

    if (!clientId || !clientSecret || !backendUrl) {
      throw new Error('OAuth configuration missing');
    }

    // 토큰 교환
    const tokenUrl = `https://${mallId}.cafe24api.com/api/v2/oauth/token`;

    // Basic Auth 헤더 생성 (client_id:client_secret을 base64 인코딩)
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${backendUrl}/oauth/callback`,
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${tokenResponse.status} ${errorText}`);
    }

    const tokens = await tokenResponse.json() as Cafe24TokenResponse;

    // 토큰 응답 디버깅
    console.log('🔍 Raw token response from Cafe24:', {
      status: tokenResponse.status,
      headers: Object.fromEntries(tokenResponse.headers.entries()),
      body: tokens
    });

    // 토큰을 DB에 저장 (실패해도 계속 진행)
    try {
      await saveTokensForMall(mallId, tokens);
      console.log(`✅ OAuth tokens saved successfully for mall: ${mallId}`);
    } catch (dbError) {
      console.error('❌ Failed to save tokens to database:', dbError);
      // DB 저장 실패해도 토큰 교환은 성공했으므로 계속 진행
    }

    // 로그인 로그 저장 (실패해도 계속 진행)
    try {
      await saveLoginLog({
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        user_agent: req.get('User-Agent'),
        success: true
      });
    } catch (logError) {
      console.error('Failed to save login log:', logError);
      // 로그 저장 실패해도 계속 진행
    }

    // state 쿠키 삭제
    res.clearCookie('oauth_state');

    // 성공 후 프론트엔드로 리다이렉트
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/settings?installed=1&mall_id=${mallId}`);

  } catch (error: any) {
    console.error('OAuth callback error:', error);

    // 로그인 로그 저장 (실패해도 계속 진행)
    try {
      await saveLoginLog({
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        user_agent: req.get('User-Agent'),
        success: false,
        error_message: error.message
      });
    } catch (logError) {
      console.error('Failed to save error log:', logError);
    }

    res.status(500).send(`
      <html>
        <body>
          <h1>OAuth Failed</h1>
          <p>Error: ${error.message}</p>
          <p>Please try again or contact support.</p>
        </body>
      </html>
    `);
  }
});

// 토큰 상태 확인 (특정 몰)
router.get('/status', async (req: Request, res: Response) => {
  try {
    const mallId = req.query.mall_id as string;

    if (!mallId) {
      return res.json({
        success: false,
        error: 'mall_id parameter is required'
      });
    }

    const tokens = await getTokensForMall(mallId);

    if (!tokens || !tokens.access_token) {
      return res.json({
        success: true,
        data: {
          status: 'disconnected',
          has_token: false,
          mall_id: mallId
        }
      });
    }

    // 토큰 만료 확인
    const isExpired = tokens.expires_at && new Date() >= new Date(tokens.expires_at);

    res.json({
      success: true,
      data: {
        status: isExpired ? 'expired' : 'connected',
        has_token: true,
        mall_id: mallId,
        token_preview: tokens.access_token.substring(0, 20) + '...',
        expires_at: tokens.expires_at
      }
    });
  } catch (error: any) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// 토큰 갱신 엔드포인트
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { mall_id } = req.body;

    if (!mall_id) {
      return res.status(400).json({
        success: false,
        error: 'mall_id is required'
      });
    }

    const newTokens = await refreshCafe24Token(mall_id);

    res.json({
      success: true,
      data: {
        mall_id,
        token_preview: newTokens.access_token.substring(0, 20) + '...',
        expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
