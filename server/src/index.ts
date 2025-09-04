import express from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import oauth from './routes/oauth';
import webhook from './routes/webhook';
import orders from './routes/orders';
import auth from './routes/auth';

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

// 헬스 체크
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '1.0.0',
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

app.listen(port, host, () => {
  console.log(`🚀 API Server running on http://${host}:${port}`);
  console.log(`📊 Health check: ${url}/health`);
  console.log(`🔐 OAuth callback: ${url}/oauth/callback`);
  console.log(`📦 Webhook endpoint: ${url}/webhook/logiview`);
});