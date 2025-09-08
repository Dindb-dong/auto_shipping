import { z } from 'zod';

// 카페24 API 응답 스키마
const Cafe24TokenResponse = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number().optional(), // 카페24에서는 expires_at을 사용할 수도 있음
  expires_at: z.string().optional(), // 카페24에서 제공하는 절대 시간
  token_type: z.string().optional(),
  scope: z.string().optional(),
  // 추가 필드들
  client_id: z.string().optional(),
  mall_id: z.string().optional(),
  user_id: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  issued_at: z.string().optional(),
  shop_no: z.string().optional(),
  refresh_token_expires_at: z.string().optional(),
});

const Cafe24ShipmentResponse = z.object({
  shipment: z.object({
    order_id: z.string(),
    tracking_no: z.string(),
    shipping_company_code: z.string(),
    status: z.string(),
  }),
});

export type Cafe24TokenResponse = z.infer<typeof Cafe24TokenResponse>;
export type Cafe24ShipmentResponse = z.infer<typeof Cafe24ShipmentResponse>;

// 카페24 API 클라이언트
export class Cafe24Client {
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = process.env.CAFE24_CLIENT_ID!;
    this.clientSecret = process.env.CAFE24_CLIENT_SECRET!;
  }

  // 특정 몰의 API 호출을 위한 헬퍼 함수
  private getBaseUrl(mallId: string): string {
    return `https://${mallId}.cafe24api.com/api/v2`;
  }

  // OAuth 코드를 액세스 토큰으로 교환 (특정 몰)
  async exchangeCode(mallId: string, code: string, redirectUri: string): Promise<Cafe24TokenResponse> {
    const baseUrl = this.getBaseUrl(mallId);

    // Basic Auth 헤더 생성
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch(`${baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const data = await response.json();
    return Cafe24TokenResponse.parse(data);
  }

  // 리프레시 토큰으로 액세스 토큰 갱신 (특정 몰)
  async refreshToken(mallId: string, refreshToken: string): Promise<Cafe24TokenResponse> {
    const baseUrl = this.getBaseUrl(mallId);

    // Basic Auth 헤더 생성
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch(`${baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const data = await response.json();
    return Cafe24TokenResponse.parse(data);
  }

  // 송장번호 입력 및 배송상태 변경 (핵심 기능)
  async createShipment(
    mallId: string,
    accessToken: string,
    orderId: string,
    shipmentData: {
      tracking_no: string;
      shipping_company_code: string;
      status?: string;
      order_item_code?: string[];
      shipping_code?: string;
      carrier_id?: number;
    }
  ): Promise<any> {
    const baseUrl = this.getBaseUrl(mallId);

    // 카페24 API 문서에 따른 올바른 구조 사용
    const payload = {
      shop_no: 1,
      request: {
        tracking_no: shipmentData.tracking_no,
        shipping_company_code: shipmentData.shipping_company_code,
        ...(shipmentData.status && { status: shipmentData.status }),
        ...(shipmentData.order_item_code && { order_item_code: shipmentData.order_item_code }),
        ...(shipmentData.shipping_code && { shipping_code: shipmentData.shipping_code }),
        ...(shipmentData.carrier_id && { carrier_id: shipmentData.carrier_id }),
      }
    };

    console.log('🔍 Cafe24 Shipment Creation Request:', {
      url: `${baseUrl}/admin/orders/${orderId}/shipments`,
      payload
    });

    const data = await this.callApiWithToken(mallId, `/admin/orders/${orderId}/shipments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    console.log('✅ Cafe24 Shipment Creation Response:', data);
    return data;
  }

  // 기존 배송정보 조회
  async getShipments(
    mallId: string,
    accessToken: string,
    orderId: string
  ): Promise<any> {
    const baseUrl = this.getBaseUrl(mallId);

    console.log('🔍 Cafe24 Shipments Get Request:', {
      url: `${baseUrl}/admin/orders/${orderId}/shipments`
    });

    const data = await this.callApiWithToken(mallId, `/admin/orders/${orderId}/shipments`, {
      method: 'GET'
    });
    console.log('✅ Cafe24 Shipments Get Response:', data);
    return data;
  }

  // 주문 상세 조회
  async getOrder(
    mallId: string,
    accessToken: string,
    orderId: string
  ): Promise<any> {
    const data = await this.callApiWithToken(mallId, `/admin/orders/${orderId}`, {
      method: 'GET'
    });
    return data;
  }

  // 배송상태만 수정 (PUT status 전용)
  async updateShipmentStatus(
    mallId: string,
    accessToken: string,
    orderId: string,
    shippingCode: string,
    params: { status: 'standby' | 'shipping' | 'shipped'; status_additional_info?: string }
  ): Promise<any> {
    const payload = {
      shop_no: 1,
      request: {
        status: params.status,
        ...(params.status_additional_info && { status_additional_info: params.status_additional_info })
      }
    };

    console.log('🔄 Cafe24 Shipment Status Update Request:', {
      url: `${this.getBaseUrl(mallId)}/admin/orders/${orderId}/shipments/${shippingCode}`,
      payload
    });

    const data = await this.callApiWithToken(mallId, `/admin/orders/${orderId}/shipments/${shippingCode}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log('✅ Cafe24 Shipment Status Update Response:', data);
    return data;
  }

  // 배송정보 수정 (기존 송장번호가 있는 경우)
  async updateShipment(
    mallId: string,
    accessToken: string,
    orderId: string,
    shipmentData: {
      tracking_no: string;
      shipping_company_code: string;
      status?: string;
      order_item_code?: string[];
      shipping_code?: string;
      carrier_id?: number;
    }
  ): Promise<any> {
    // 기존 배송정보만 PUT으로 수정. 존재하지 않으면 에러 반환
    const existingShipments = await this.getShipments(mallId, accessToken, orderId);

    if (!(existingShipments.shipments && existingShipments.shipments.length > 0)) {
      throw new Error('No existing shipment found. Cannot update tracking for this order.');
    }

    const shippingCode = existingShipments.shipments[0].shipping_code;

    const payload = {
      shop_no: 1,
      request: {
        tracking_no: shipmentData.tracking_no,
        shipping_company_code: shipmentData.shipping_company_code,
        // 상태 변경은 별도 API에서 수행
        ...(shipmentData.carrier_id && { carrier_id: shipmentData.carrier_id }),
      }
    };

    console.log('🔄 Cafe24 Shipment Update Request:', {
      url: `${this.getBaseUrl(mallId)}/admin/orders/${orderId}/shipments/${shippingCode}`,
      payload
    });

    const data = await this.callApiWithToken(mallId, `/admin/orders/${orderId}/shipments/${shippingCode}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log('✅ Cafe24 Shipment Update Response:', data);
    return data;
  }

  // 주문 목록 조회 (특정 몰)
  async getOrders(
    mallId: string,
    accessToken: string,
    params: {
      start_date?: string;
      end_date?: string;
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const baseUrl = this.getBaseUrl(mallId);
    const searchParams = new URLSearchParams();

    // 카페24 API 문서에 따른 올바른 파라미터명 사용
    if (params.start_date) searchParams.append('start_date', params.start_date);
    if (params.end_date) searchParams.append('end_date', params.end_date);
    if (params.status) searchParams.append('shipping_status', params.status);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());

    console.log('🔍 Cafe24 Orders API Request:', {
      url: `${baseUrl}/admin/orders?${searchParams}`,
      params: Object.fromEntries(searchParams)
    });

    const data = await this.callApiWithToken(mallId, `/admin/orders?${searchParams}`, {
      method: 'GET'
    }) as any;
    console.log('✅ Cafe24 Orders API Response:', {
      total_count: data.orders?.length || 0,
      orders_preview: data.orders?.slice(0, 3).map((order: any) => ({
        order_id: order.order_id,
        shipping_status: order.shipping_status,
        order_date: order.order_date
      })) || []
    });

    return data;
  }

  // API 호출 헬퍼 함수 (자동 토큰 갱신 포함)
  async callApiWithToken(mallId: string, path: string, options: RequestInit = {}): Promise<any> {
    const { getValidAccessTokenForMall } = await import('./database');

    let accessToken = await getValidAccessTokenForMall(mallId);

    const baseUrl = this.getBaseUrl(mallId);
    const url = `${baseUrl}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Cafe24-Api-Version': '2025-06-01',
        ...options.headers,
      },
    });

    // 401 에러 시 토큰 갱신 후 재시도
    if (response.status === 401) {
      const { refreshCafe24Token } = await import('./database');
      const newTokens = await refreshCafe24Token(mallId);
      accessToken = newTokens.access_token;

      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Cafe24-Api-Version': '2025-06-01',
          ...options.headers,
        },
      });

      if (!retryResponse.ok) {
        const error = await retryResponse.text();
        throw new Error(`API call failed: ${retryResponse.status} ${error}`);
      }

      return await retryResponse.json();
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API call failed: ${response.status} ${error}`);
    }

    return await response.json();
  }
}

// 싱글톤 인스턴스
export const cafe24Client = new Cafe24Client();
