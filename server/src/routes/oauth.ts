import { Router, Request, Response } from 'express';
import { cafe24Client } from '../lib/cafe24';
import { saveTokens, saveLoginLog } from '../lib/database';

const router = Router();

// OAuth 콜백 처리
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query as {
    code?: string;
    state?: string;
    error?: string;
  };

  // 에러 처리
  if (error) {
    console.error('OAuth error:', error);
    await saveLoginLog({
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      user_agent: req.get('User-Agent'),
      success: false,
      error_message: `OAuth error: ${error}`
    });
    return res.status(400).send(`
      <html>
        <body>
          <h1>OAuth 인증 실패</h1>
          <p>에러: ${error}</p>
          <p>다시 시도해주세요.</p>
        </body>
      </html>
    `);
  }

  // 코드 검증
  if (!code) {
    await saveLoginLog({
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      user_agent: req.get('User-Agent'),
      success: false,
      error_message: 'Missing authorization code'
    });
    return res.status(400).send(`
      <html>
        <body>
          <h1>인증 코드 누락</h1>
          <p>카페24에서 인증 코드를 받지 못했습니다.</p>
          <p>다시 시도해주세요.</p>
        </body>
      </html>
    `);
  }

  try {
    console.log('Exchanging authorization code for tokens...');

    // 인증 코드를 액세스 토큰으로 교환
    const tokens = await cafe24Client.exchangeCode(code);

    // 토큰을 데이터베이스에 저장
    await saveTokens(tokens);

    // 로그인 로그 저장
    await saveLoginLog({
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      user_agent: req.get('User-Agent'),
      success: true
    });

    console.log('OAuth tokens saved successfully');

    // 성공 페이지
    res.send(`
      <html>
        <head>
          <title>카페24 연동 완료</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #28a745; }
            .info { color: #6c757d; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1 class="success">✅ 카페24 연동이 완료되었습니다!</h1>
          <p>이제 로지뷰 시스템을 사용할 수 있습니다.</p>
          <div class="info">
            <p><strong>접근 토큰:</strong> ${tokens.access_token.substring(0, 20)}...</p>
            <p><strong>만료 시간:</strong> ${tokens.expires_in}초</p>
            <p><strong>권한 범위:</strong> ${tokens.scope}</p>
          </div>
          <p>이 창은 닫아도 됩니다.</p>
        </body>
      </html>
    `);

  } catch (error: any) {
    console.error('Token exchange failed:', error);

    await saveLoginLog({
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      user_agent: req.get('User-Agent'),
      success: false,
      error_message: error.message
    });

    res.status(500).send(`
      <html>
        <body>
          <h1>토큰 발급 실패</h1>
          <p>에러: ${error.message}</p>
          <p>관리자에게 문의하거나 다시 시도해주세요.</p>
        </body>
      </html>
    `);
  }
});

// OAuth 설치 URL 생성
router.get('/install', (req: Request, res: Response) => {
  const mallId = process.env.MALL_ID;
  const clientId = process.env.CAFE24_CLIENT_ID;
  const redirectUri = process.env.OAUTH_REDIRECT_URI;

  if (!mallId || !clientId || !redirectUri) {
    return res.status(500).json({
      error: 'OAuth configuration missing. Please check environment variables.'
    });
  }

  const installUrl = new URL(`https://${mallId}.cafe24api.com/api/v2/oauth/authorize`);
  installUrl.searchParams.set('response_type', 'code');
  installUrl.searchParams.set('client_id', clientId);
  installUrl.searchParams.set('redirect_uri', redirectUri);
  installUrl.searchParams.set('scope', 'mall.read_order mall.write_order');
  installUrl.searchParams.set('state', 'auto_shipping_' + Date.now());

  res.json({
    install_url: installUrl.toString(),
    message: '카페24 앱 설치를 위해 아래 URL을 클릭하세요.'
  });
});

// 토큰 상태 확인
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { getValidAccessToken } = await import('../lib/database');
    const accessToken = await getValidAccessToken();

    res.json({
      status: 'connected',
      has_token: true,
      token_preview: accessToken.substring(0, 20) + '...'
    });
  } catch (error: any) {
    res.json({
      status: 'disconnected',
      has_token: false,
      error: error.message
    });
  }
});

export default router;
