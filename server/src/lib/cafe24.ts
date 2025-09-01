import { z } from 'zod';

// 카페24 API 응답 스키마
const Cafe24TokenResponse = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
  token_type: z.string(),
  scope: z.string(),
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
  private mallId: string;
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;

  constructor() {
    this.mallId = process.env.MALL_ID!;
    this.clientId = process.env.CAFE24_CLIENT_ID!;
    this.clientSecret = process.env.CAFE24_CLIENT_SECRET!;
    this.baseUrl = `https://${this.mallId}.cafe24api.com/api/v2`;
  }

  // OAuth 코드를 액세스 토큰으로 교환
  async exchangeCode(code: string): Promise<Cafe24TokenResponse> {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: process.env.OAUTH_REDIRECT_URI!,
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const data = await response.json();
    return Cafe24TokenResponse.parse(data);
  }

  // 리프레시 토큰으로 액세스 토큰 갱신
  async refreshToken(refreshToken: string): Promise<Cafe24TokenResponse> {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
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

  // 배송 정보 생성/수정
  async createShipment(
    accessToken: string,
    shipmentData: {
      order_id: string;
      tracking_no: string;
      shipping_company_code: string;
      status: string;
      items?: any[];
    }
  ): Promise<Cafe24ShipmentResponse> {
    const response = await fetch(`${this.baseUrl}/admin/orders/${shipmentData.order_id}/shipments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': '2022-03-01',
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

  // 배송 정보 수정
  async updateShipment(
    accessToken: string,
    orderId: string,
    shipmentData: {
      tracking_no: string;
      shipping_company_code: string;
      status: string;
    }
  ): Promise<Cafe24ShipmentResponse> {
    const response = await fetch(`${this.baseUrl}/admin/orders/${orderId}/shipments`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': '2022-03-01',
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

  // 주문 목록 조회
  async getOrders(
    accessToken: string,
    params: {
      start_date?: string;
      end_date?: string;
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const searchParams = new URLSearchParams();
    if (params.start_date) searchParams.append('start_date', params.start_date);
    if (params.end_date) searchParams.append('end_date', params.end_date);
    if (params.status) searchParams.append('status', params.status);
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());

    const response = await fetch(`${this.baseUrl}/admin/orders?${searchParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Cafe24-Api-Version': '2022-03-01',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Orders fetch failed: ${error}`);
    }

    return await response.json();
  }
}

// 싱글톤 인스턴스
export const cafe24Client = new Cafe24Client();
