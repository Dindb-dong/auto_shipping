import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { cafe24Client } from '../lib/cafe24';
import { getValidAccessToken, getValidAccessTokenForMall, getShipmentLogs } from '../lib/database';
import { buildTrackingUrl, normalizeShippingCompany } from '../lib/tracking';

const router = Router();

// 주문 조회 파라미터 스키마
const OrderQuerySchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.string().optional(),
  limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).optional(),
  offset: z.string().transform(val => parseInt(val)).pipe(z.number().min(0)).optional(),
  sort: z.enum(['date_asc', 'date_desc', 'order_id_asc', 'order_id_desc']).optional()
});

// 주문 목록 조회
router.get('/', async (req: Request, res: Response) => {
  try {
    // 파라미터 검증
    const queryParams = OrderQuerySchema.parse(req.query);

    // TODO: mall_id를 어떻게 가져올지 결정해야 함
    // 임시로 환경변수에서 가져옴
    const mallId = process.env.MALL_ID;
    if (!mallId) {
      throw new Error('MALL_ID environment variable is required');
    }

    // 유효한 액세스 토큰 가져오기
    const accessToken = await getValidAccessTokenForMall(mallId);

    // 날짜 범위가 없으면 기본값 설정 (최근 30일)
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const startDate = queryParams.start_date || defaultStartDate.toISOString().split('T')[0];
    const endDate = queryParams.end_date || defaultEndDate.toISOString().split('T')[0];

    // 카페24에서 주문 목록 조회
    const orders: any = await cafe24Client.getOrders(mallId, accessToken, {
      start_date: startDate,
      end_date: endDate,
      status: queryParams.status,
      limit: queryParams.limit || 50,
      offset: queryParams.offset || 0
    });

    // 정렬 처리
    if (queryParams.sort) {
      orders.orders.sort((a: any, b: any) => {
        switch (queryParams.sort) {
          case 'date_asc':
            return new Date(a.order_date).getTime() - new Date(b.order_date).getTime();
          case 'date_desc':
            return new Date(b.order_date).getTime() - new Date(a.order_date).getTime();
          case 'order_id_asc':
            return a.order_id.localeCompare(b.order_id);
          case 'order_id_desc':
            return b.order_id.localeCompare(a.order_id);
          default:
            return 0;
        }
      });
    }

    // 각 주문에 대해 배송정보 조회
    const ordersWithShipments = await Promise.all(
      orders.orders.map(async (order: any) => {
        try {
          const shipments = await cafe24Client.getShipments(mallId, accessToken, order.order_id);
          return {
            ...order,
            shipments: shipments.shipments || []
          };
        } catch (error) {
          console.warn(`Failed to fetch shipments for order ${order.order_id}:`, error);
          return {
            ...order,
            shipments: []
          };
        }
      })
    );

    res.json({
      success: true,
      data: ordersWithShipments,
      pagination: {
        total: orders.total_count || orders.orders.length,
        limit: queryParams.limit || 50,
        offset: queryParams.offset || 0,
        has_more: orders.orders.length === (queryParams.limit || 50)
      }
    });

  } catch (error: any) {
    console.error('Orders fetch error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders',
      message: error.message
    });
  }
});

// 특정 주문 상세 조회
router.get('/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    // TODO: mall_id를 어떻게 가져올지 결정해야 함
    // 임시로 환경변수에서 가져옴
    const mallId = process.env.MALL_ID;
    if (!mallId) {
      throw new Error('MALL_ID environment variable is required');
    }

    // 유효한 액세스 토큰 가져오기
    const accessToken = await getValidAccessTokenForMall(mallId);

    // 카페24에서 특정 주문 조회 (401 시 자동 토큰 갱신 및 재시도)
    const order: any = await cafe24Client.callApiWithToken(mallId, `/admin/orders/${orderId}`, {
      method: 'GET'
    });

    res.json({
      success: true,
      data: order.order
    });

  } catch (error: any) {
    console.error('Order detail fetch error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch order details',
      message: error.message
    });
  }
});

// 특정 주문의 아이템 목록 조회 (product_no/product_code 추출용)
router.get('/:orderId/items', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    const mallId = process.env.MALL_ID;
    if (!mallId) {
      throw new Error('MALL_ID environment variable is required');
    }

    const accessToken = await getValidAccessTokenForMall(mallId);

    // 카페24 주문 아이템 API 호출
    const itemsResp: any = await cafe24Client.callApiWithToken(mallId, `/admin/orders/${orderId}/items`, {
      method: 'GET'
    });

    const items: any[] = Array.isArray(itemsResp?.items) ? itemsResp.items : [];
    const primary = items[0] || null;

    res.json({
      success: true,
      data: {
        items,
        primary_product_no: primary?.product_no ?? null,
      }
    });
  } catch (error: any) {
    console.error('Order items fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch order items', message: error.message });
  }
});

// 주문의 배송 로그 조회
router.get('/:orderId/shipments', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    // 데이터베이스에서 배송 로그 조회
    const shipmentLogs = await getShipmentLogs({
      order_id: orderId
    });

    res.json({
      success: true,
      data: shipmentLogs
    });

  } catch (error: any) {
    console.error('Shipment logs fetch error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch shipment logs',
      message: error.message
    });
  }
});

// 배송 상태별 주문 통계
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query as {
      start_date?: string;
      end_date?: string;
    };

    // TODO: mall_id를 어떻게 가져올지 결정해야 함
    // 임시로 환경변수에서 가져옴
    const mallId = process.env.MALL_ID;
    if (!mallId) {
      throw new Error('MALL_ID environment variable is required');
    }

    // 유효한 액세스 토큰 가져오기
    const accessToken = await getValidAccessTokenForMall(mallId);

    // 날짜 범위가 없으면 기본값 설정 (최근 30일)
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const finalStartDate = start_date || defaultStartDate.toISOString().split('T')[0];
    const finalEndDate = end_date || defaultEndDate.toISOString().split('T')[0];

    // 한 번 조회 후 로컬에서 상태별 카운트 집계
    const allOrdersResp: any = await cafe24Client.getOrders(mallId, accessToken, {
      start_date: finalStartDate,
      end_date: finalEndDate,
      limit: 100,
      offset: 0
    });

    const ordersList: any[] = Array.isArray(allOrdersResp.orders) ? allOrdersResp.orders : [];

    const stats: Record<string, number> = {
      preparing: 0,
      shipping: 0,
      delivered: 0,
      returned: 0,
      cancelled: 0,
    };

    for (const order of ordersList) {
      const s = order.shipping_status;
      if (s === 'F') stats.preparing += 1;       // 배송전
      else if (s === 'M') stats.shipping += 1;   // 배송중
      else if (s === 'D' || s === 'T') stats.delivered += 1; // 배송완료
      else if (s === 'R') stats.returned += 1;   // 반품
      else if (s === 'C') stats.cancelled += 1;  // 취소
    }

    res.json({
      success: true,
      data: {
        period: { start_date: finalStartDate, end_date: finalEndDate },
        stats
      }
    });

  } catch (error: any) {
    console.error('Stats fetch error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch order statistics',
      message: error.message
    });
  }
});

// 송장번호 업데이트
router.put('/:orderId/tracking', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { tracking_no, shipping_company_code = '0018' } = req.body; // 기본값: 한진택배

    if (!orderId || !tracking_no) {
      return res.status(400).json({
        success: false,
        error: 'Order ID and tracking number are required'
      });
    }

    const mallId = process.env.MALL_ID;
    if (!mallId) {
      throw new Error('MALL_ID environment variable is required');
    }

    const accessToken = await getValidAccessTokenForMall(mallId);

    // 송장번호 업데이트 (배송정보 생성/수정)
    // 상태는 강제 변경하지 않음 (카페24에서 상태 전환 불가 시 422 발생 방지)
    const result = await cafe24Client.updateShipment(mallId, accessToken, orderId, {
      tracking_no,
      shipping_company_code
    });

    res.json({
      success: true,
      data: result,
      message: '송장번호가 성공적으로 업데이트되었습니다'
    });

  } catch (error: any) {
    console.error('Tracking number update error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to update tracking number',
      message: error.message
    });
  }
});

export default router;

// 주문 배송상태만 변경
router.put('/:orderId/status', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status, status_additional_info } = req.body as { status: 'standby' | 'shipping' | 'shipped'; status_additional_info?: string };

    if (!orderId || !status) {
      return res.status(400).json({ success: false, error: 'Order ID and status are required' });
    }

    const mallId = process.env.MALL_ID;
    if (!mallId) {
      throw new Error('MALL_ID environment variable is required');
    }

    const accessToken = await getValidAccessTokenForMall(mallId);

    // 배송코드 조회
    const shipmentsResp = await cafe24Client.getShipments(mallId, accessToken, orderId);
    const shipments = shipmentsResp?.shipments || [];
    if (shipments.length === 0 || !shipments[0].shipping_code) {
      return res.status(400).json({ success: false, error: 'No shipment found to update status' });
    }

    const shippingCode = shipments[0].shipping_code;

    const result = await cafe24Client.updateShipmentStatus(mallId, accessToken, orderId, shippingCode, {
      status,
      status_additional_info
    });

    res.json({ success: true, data: result, message: '배송상태가 업데이트되었습니다' });
  } catch (error: any) {
    console.error('Shipping status update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update shipping status', message: error.message });
  }
});

// 주문의 실시간 배송조회 (한진 URL 포함)
router.get('/:orderId/tracking', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    const mallId = process.env.MALL_ID;
    if (!mallId) {
      throw new Error('MALL_ID environment variable is required');
    }

    const accessToken = await getValidAccessTokenForMall(mallId);

    // Get shipments from Cafe24
    const shipmentsResp = await cafe24Client.getShipments(mallId, accessToken, orderId);
    const shipments = shipmentsResp?.shipments || [];

    // Pick first shipment with tracking number
    const primary = shipments.find((s: any) => s.tracking_no) || shipments[0];

    if (!primary) {
      return res.json({
        success: true,
        data: { order_id: orderId, shipments: [], tracking: null }
      });
    }

    const normalizedCarrier = normalizeShippingCompany(primary.shipping_company_code);
    const url = buildTrackingUrl(primary.shipping_company_code, primary.tracking_no);

    const tracking = {
      order_id: orderId,
      tracking_no: primary.tracking_no,
      shipping_company_code: primary.shipping_company_code,
      carrier: normalizedCarrier,
      status: primary.status,
      url
    };

    res.json({ success: true, data: { order_id: orderId, shipments, tracking } });
  } catch (error: any) {
    console.error('Tracking fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tracking', message: error.message });
  }
});
