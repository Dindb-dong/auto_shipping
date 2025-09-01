import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { cafe24Client } from '../lib/cafe24';
import { getValidAccessToken, saveShipmentLog } from '../lib/database';

const router = Router();

// 로지뷰 웹훅 데이터 스키마
const LogiviewWebhookSchema = z.object({
  order_id: z.string().min(1, 'Order ID is required'),
  tracking_no: z.string().min(1, 'Tracking number is required'),
  shipping_company_code: z.string().min(1, 'Shipping company code is required'),
  status: z.enum(['shipping', 'delivered', 'returned']),
  items: z.array(z.object({
    product_id: z.string(),
    variant_id: z.string().optional(),
    quantity: z.number().positive()
  })).optional(),
  metadata: z.record(z.any()).optional()
});

type LogiviewWebhookData = z.infer<typeof LogiviewWebhookSchema>;

// Cloudflare Zero Trust 인증 미들웨어
function authenticateWebhook(req: Request, res: Response, next: Function) {
  // Service Token 인증 (Cloudflare Zero Trust)
  const clientId = req.headers['cf-access-client-id'];
  const clientSecret = req.headers['cf-access-client-secret'];

  if (process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET) {
    if (clientId !== process.env.CF_ACCESS_CLIENT_ID ||
      clientSecret !== process.env.CF_ACCESS_CLIENT_SECRET) {
      return res.status(401).json({ error: 'Unauthorized: Invalid service token' });
    }
  }

  // API Key 인증 (대안)
  const apiKey = req.headers['x-api-key'];
  if (process.env.PARTNER_API_KEY && apiKey !== process.env.PARTNER_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }

  next();
}

// 로지뷰 웹훅 처리
router.post('/logiview', authenticateWebhook, async (req: Request, res: Response) => {
  try {
    console.log('Received webhook from Logiview:', JSON.stringify(req.body, null, 2));

    // 데이터 검증
    const webhookData = LogiviewWebhookSchema.parse(req.body);

    // 유효한 액세스 토큰 가져오기 (자동 갱신 포함)
    const accessToken = await getValidAccessToken();

    // 카페24에 배송 정보 전송
    let cafe24Response;
    try {
      cafe24Response = await cafe24Client.createShipment(accessToken, {
        order_id: webhookData.order_id,
        tracking_no: webhookData.tracking_no,
        shipping_company_code: webhookData.shipping_company_code,
        status: webhookData.status,
        items: webhookData.items
      });

      console.log('Successfully created shipment in Cafe24:', cafe24Response);

    } catch (cafe24Error: any) {
      console.error('Cafe24 API error:', cafe24Error);

      // 409 Conflict (이미 배송 정보가 있는 경우) - 업데이트 시도
      if (cafe24Error.message.includes('409') || cafe24Error.message.includes('already exists')) {
        console.log('Shipment already exists, attempting to update...');
        cafe24Response = await cafe24Client.updateShipment(accessToken, webhookData.order_id, {
          tracking_no: webhookData.tracking_no,
          shipping_company_code: webhookData.shipping_company_code,
          status: webhookData.status
        });
        console.log('Successfully updated shipment in Cafe24:', cafe24Response);
      } else {
        throw cafe24Error;
      }
    }

    // 배송 로그 저장
    await saveShipmentLog({
      order_id: webhookData.order_id,
      tracking_no: webhookData.tracking_no,
      shipping_company_code: webhookData.shipping_company_code,
      status: webhookData.status,
      payload: webhookData,
      cafe24_response: cafe24Response
    });

    res.json({
      success: true,
      message: 'Shipment processed successfully',
      data: {
        order_id: webhookData.order_id,
        tracking_no: webhookData.tracking_no,
        cafe24_response: cafe24Response
      }
    });

  } catch (error: any) {
    console.error('Webhook processing error:', error);

    // 배송 로그 저장 (실패한 경우)
    if (req.body.order_id && req.body.tracking_no) {
      try {
        await saveShipmentLog({
          order_id: req.body.order_id,
          tracking_no: req.body.tracking_no,
          shipping_company_code: req.body.shipping_company_code || 'unknown',
          status: 'error',
          payload: req.body,
          cafe24_response: { error: error.message }
        });
      } catch (logError) {
        console.error('Failed to save error log:', logError);
      }
    }

    // 에러 응답
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 웹훅 테스트 엔드포인트
router.post('/test', async (req: Request, res: Response) => {
  const testData = {
    order_id: 'TEST-' + Date.now(),
    tracking_no: '123456789012',
    shipping_company_code: 'kr.cjlogistics',
    status: 'shipping' as const,
    items: [{
      product_id: 'test-product',
      quantity: 1
    }]
  };

  console.log('Test webhook data:', testData);

  try {
    // 데이터 검증
    const webhookData = LogiviewWebhookSchema.parse(testData);

    // 유효한 액세스 토큰 가져오기 (자동 갱신 포함)
    const accessToken = await getValidAccessToken();

    // 카페24에 배송 정보 전송
    let cafe24Response;
    try {
      cafe24Response = await cafe24Client.createShipment(accessToken, {
        order_id: webhookData.order_id,
        tracking_no: webhookData.tracking_no,
        shipping_company_code: webhookData.shipping_company_code,
        status: webhookData.status,
        items: webhookData.items
      });

      console.log('Successfully created test shipment in Cafe24:', cafe24Response);

    } catch (cafe24Error: any) {
      console.error('Cafe24 API error during test:', cafe24Error);

      // 409 Conflict (이미 배송 정보가 있는 경우) - 업데이트 시도
      if (cafe24Error.message.includes('409') || cafe24Error.message.includes('already exists')) {
        console.log('Test shipment already exists, attempting to update...');
        cafe24Response = await cafe24Client.updateShipment(accessToken, webhookData.order_id, {
          tracking_no: webhookData.tracking_no,
          shipping_company_code: webhookData.shipping_company_code,
          status: webhookData.status
        });
        console.log('Successfully updated test shipment in Cafe24:', cafe24Response);
      } else {
        throw cafe24Error;
      }
    }

    // 배송 로그 저장
    await saveShipmentLog({
      order_id: webhookData.order_id,
      tracking_no: webhookData.tracking_no,
      shipping_company_code: webhookData.shipping_company_code,
      status: webhookData.status,
      payload: webhookData,
      cafe24_response: cafe24Response
    });

    res.json({
      success: true,
      message: 'Test webhook processed successfully',
      data: {
        order_id: webhookData.order_id,
        tracking_no: webhookData.tracking_no,
        cafe24_response: cafe24Response
      }
    });

  } catch (error: any) {
    console.error('Test webhook processing error:', error);

    // 배송 로그 저장 (실패한 경우)
    try {
      await saveShipmentLog({
        order_id: testData.order_id,
        tracking_no: testData.tracking_no,
        shipping_company_code: testData.shipping_company_code,
        status: 'error',
        payload: testData,
        cafe24_response: { error: error.message }
      });
    } catch (logError) {
      console.error('Failed to save test error log:', logError);
    }

    // 에러 응답
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid test webhook data',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Test webhook failed',
      message: error.message
    });
  }
});

// 웹훅 상태 확인
router.get('/status', (req: Request, res: Response) => {
  res.json({
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      logiview: '/webhook/logiview',
      test: '/webhook/test'
    }
  });
});

export default router;
