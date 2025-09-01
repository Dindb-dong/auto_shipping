import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import oauth from './routes/oauth';
import webhook from './routes/webhook';
import orders from './routes/orders';

// 환경변수 로드
dotenv.config();

const app = express();

// 보안 미들웨어
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// JSON 파싱
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 헬스 체크
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API 라우트
app.use('/oauth', oauth);         // /oauth/callback
app.use('/webhook', webhook);     // /webhook/logiview
app.use('/api/orders', orders);   // /api/orders/*

// 404 핸들러
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 에러 핸들러
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 API Server running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🔐 OAuth callback: http://localhost:${port}/oauth/callback`);
  console.log(`📦 Webhook endpoint: http://localhost:${port}/webhook/logiview`);
});
