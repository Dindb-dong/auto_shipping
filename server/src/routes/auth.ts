import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

// 관리자 로그인 요청 스키마
const AdminLoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

type AdminLoginRequest = z.infer<typeof AdminLoginSchema>;

// 관리자 로그인
router.post('/admin/login', async (req: Request, res: Response) => {
  try {
    // 데이터 검증
    const { username, password } = AdminLoginSchema.parse(req.body);

    // 환경변수에서 관리자 계정 정보 가져오기
    const adminUser = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS;

    if (!adminUser || !adminPass) {
      return res.status(500).json({
        success: false,
        error: 'Admin credentials not configured'
      });
    }

    // 인증 확인
    if (username === adminUser && password === adminPass) {
      // 성공 시 세션 정보 반환 (실제로는 JWT 토큰을 사용하는 것이 좋음)
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          authenticated: true,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

  } catch (error: any) {
    console.error('Admin login error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// 관리자 로그아웃 (클라이언트 사이드에서 처리)
router.post('/admin/logout', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

export default router;
