// Simple helpers for building external tracking URLs

export function buildTrackingUrl(shippingCompanyCode: string | undefined, trackingNo: string | undefined): string | undefined {
  if (!trackingNo) return undefined;

  const code = (shippingCompanyCode || '').toLowerCase();

  // Hanjin (한진택배)
  // Common cafe24 code for Hanjin appears as '0018' or vendor strings containing 'hanjin'
  if (code === '0018' || code.includes('hanjin')) {
    // Public tracking page. Parameter name observed as wblnum on legacy pages.
    return `https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&wblnum=${encodeURIComponent(trackingNo)}`;
  }

  // Fallback: return undefined to let the client decide
  return undefined;
}

export function normalizeShippingCompany(shippingCompanyCode: string | undefined): string | undefined {
  if (!shippingCompanyCode) return undefined;
  const code = shippingCompanyCode.toLowerCase();
  if (code === '0018' || code.includes('hanjin')) return 'hanjin';
  return code;
}


