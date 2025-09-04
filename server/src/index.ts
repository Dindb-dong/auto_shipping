import express from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import oauth from './routes/oauth';
import webhook from './routes/webhook';
import orders from './routes/orders';
import auth from './routes/auth';
import { testDatabaseConnection } from './lib/database';

// 환경변수 로드
dotenv.config();

const app = express();

// (선택) 프록시 뒤 쿠키/HTTPS 쓰면 필요
app.set('trust proxy', 1);

// 보안 헤더 (API 위주라면 COEP/CORP는 비활성 권장)
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // API JSON 응답엔 안전
}));

// CORS 옵션 일관화
const allowlist = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
].filter(Boolean) as string[];

const corsOptions: CorsOptions = {
  origin(origin, cb) {
    // 서버-서버 호출(Origin 없음)은 허용
    if (!origin) return cb(null, true);
    return allowlist.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// CORS는 라우트보다 먼저
app.use((req, res, next) => { res.header('Vary', 'Origin'); next(); });
app.use(cors(corsOptions));
// 프리플라이트 통일 처리 (반드시 같은 옵션으로!)
app.options('*', cors(corsOptions), (_req, res) => res.sendStatus(204));

// JSON 파싱
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 쿠키 파싱
app.use(cookieParser());

// 기본 헬스 체크
app.get('/health', async (_, res) => {
  const dbStatus = await testDatabaseConnection();
  res.json({
    status: dbStatus ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
    database: dbStatus ? 'connected' : 'disconnected',
  });
});

// 상세 헬스 체크
app.get('/health/detailed', async (_, res) => {
  const errors: string[] = [];
  const services: any = {};

  try {
    // 데이터베이스 연결 테스트
    const dbStatus = await testDatabaseConnection();
    services.database = dbStatus ? 'ok' : 'error';
    if (!dbStatus) {
      errors.push('데이터베이스 연결 실패');
    }
  } catch (error: any) {
    services.database = 'error';
    errors.push(`데이터베이스 오류: ${error.message}`);
  }

  // API 서버 상태 (서버가 실행 중이면 ok)
  services.api = 'ok';

  // OAuth 상태 체크 (환경변수 확인)
  const hasOauthConfig = !!(process.env.CAFE24_CLIENT_ID && process.env.CAFE24_CLIENT_SECRET);
  services.oauth = hasOauthConfig ? 'ok' : 'not_configured';
  if (!hasOauthConfig) {
    errors.push('OAuth 설정이 완료되지 않음');
  }

  // 전체 상태 결정
  let overallStatus: 'ok' | 'warning' | 'error' = 'ok';
  if (errors.length > 0) {
    if (services.database === 'error') {
      overallStatus = 'error';
    } else {
      overallStatus = 'warning';
    }
  }

  res.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
    database: services.database === 'ok' ? 'connected' : 'disconnected',
    services,
    errors: errors.length > 0 ? errors : undefined,
  });
});

// API 라우트
app.use('/oauth', oauth);
app.use('/webhook', webhook);
app.use('/api/orders', orders);
app.use('/api/auth', auth);

// 404
app.use('*', (_req, res) => res.status(404).json({ error: 'Not Found' }));

// 에러 핸들러
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
  });
});

// Railway는 PORT를 넘겨줌. 0.0.0.0에 바인딩 권장
const port = Number(process.env.PORT) || 3000;
const host = '0.0.0.0';
const url = process.env.BACKEND_URL || `http://localhost:${port}`;

// 서버 시작 전 데이터베이스 연결 테스트
async function startServer() {
  console.log('🔍 Testing database connection...');
  const dbConnected = await testDatabaseConnection();

  if (!dbConnected) {
    console.error('❌ Database connection failed. Server will start but may not function properly.');
    console.log('💡 Please check your DATABASE_URL or individual database environment variables.');
  } else {
    console.log('✅ Database connection successful');
  }

  app.listen(port, host, () => {
    console.log(`🚀 API Server running on http://${host}:${port}`);
    console.log(`📊 Health check: ${url}/health`);
    console.log(`🔐 OAuth callback: ${url}/oauth/callback`);
    console.log(`📦 Webhook endpoint: ${url}/webhook/logiview`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});