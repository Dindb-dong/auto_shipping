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

  // 배송 정보 생성/수정 (특정 몰)
  async createShipment(
    mallId: string,
    accessToken: string,
    shipmentData: {
      order_id: string;
      tracking_no: string;
      shipping_company_code: string;
      status: string;
      items?: any[];
    }
  ): Promise<Cafe24ShipmentResponse> {
    const baseUrl = this.getBaseUrl(mallId);
    const response = await fetch(`${baseUrl}/admin/orders/${shipmentData.order_id}/shipping`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': '2025-06-01',
      },
      body: JSON.stringify({
        shipment: {
          tracking_no: shipmentData.tracking_no,
          shipping_company_code: shipmentData.shipping_company_code,
          status: shipmentData.status,
          items: shipmentData.items || [],
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Shipment creation failed: ${error}`);
    }

    const data = await response.json();
    return Cafe24ShipmentResponse.parse(data);
  }

  // 배송 정보 수정 (특정 몰)
  async updateShipment(
    mallId: string,
    accessToken: string,
    orderId: string,
    shipmentData: {
      tracking_no: string;
      shipping_company_code: string;
      status: string;
    }
  ): Promise<Cafe24ShipmentResponse> {
    const baseUrl = this.getBaseUrl(mallId);
    const response = await fetch(`${baseUrl}/admin/orders/${orderId}/shipping`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': '2025-06-01',
      },
      body: JSON.stringify({
        shipment: shipmentData,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Shipment update failed: ${error}`);
    }

    const data = await response.json();
    return Cafe24ShipmentResponse.parse(data);
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
    if (params.start_date) searchParams.append('start_date', params.start_date);
    if (params.end_date) searchParams.append('end_date', params.end_date);
    if (params.status) searchParams.append('status', params.status);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());

    const response = await fetch(`${baseUrl}/admin/orders?${searchParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Cafe24-Api-Version': '2025-06-01',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Orders fetch failed: ${error}`);
    }

    return await response.json();
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
