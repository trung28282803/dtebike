/* Naver Static Map (NAVER Cloud Platform › Maps). Naver Map không cho nhúng iframe như Google,
   nên trang khách hiện ảnh bản đồ tĩnh có marker, bấm vào mở Naver Map.

   Bật: đặt NAVER_MAP_CLIENT_ID + NAVER_MAP_CLIENT_SECRET (NCP Console → Application → Maps,
   bật "Static Map"). Chưa đặt → mọi hàm trả về "tắt", trang khách rơi về Google embed/link. */

const ENDPOINT = process.env.NAVER_MAP_STATIC_URL || "https://maps.apigw.ntruss.com/map-static/v2/raster";

export const isNaverMapEnabled = () =>
  Boolean(process.env.NAVER_MAP_CLIENT_ID && process.env.NAVER_MAP_CLIENT_SECRET);

// Ảnh 640×360 @2x, zoom 16 (mức nhìn thấy tên đường) với marker đỏ tại cửa hàng.
export async function fetchStaticMap(lat: number, lng: number): Promise<Response> {
  const qs = new URLSearchParams({
    w: "640",
    h: "360",
    scale: "2",
    level: "16",
    center: `${lng},${lat}`,
    markers: `type:d|size:mid|color:red|pos:${lng} ${lat}`,
    format: "png",
    lang: "ko",
  });
  return fetch(`${ENDPOINT}?${qs}`, {
    headers: {
      "x-ncp-apigw-api-key-id": process.env.NAVER_MAP_CLIENT_ID!,
      "x-ncp-apigw-api-key": process.env.NAVER_MAP_CLIENT_SECRET!,
    },
    // Toạ độ cửa hàng hiếm khi đổi — cache ở Next fetch cache 1 ngày.
    next: { revalidate: 86_400 },
  });
}
