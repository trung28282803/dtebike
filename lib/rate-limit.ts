/* Giới hạn tần suất đơn giản theo IP, lưu trong bộ nhớ tiến trình.
 *
 * Trên Vercel mỗi instance có bộ nhớ riêng nên đây KHÔNG phải rào chắn tuyệt đối —
 * mục đích chỉ là chặn script gửi hàng loạt vào POST /api/orders (API công khai duy
 * nhất có ghi dữ liệu). Cần chặt hơn thì chuyển sang Upstash/Redis. */

const WINDOW_MS = 10 * 60_000;
const MAX_HITS = 8;

const hits = new Map<string, number[]>();

export function allowRequest(key: string): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_HITS) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  // Dọn bớt khi map phình to (nhiều IP lạ).
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  }
  return true;
}

export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? headers.get("x-real-ip") ?? "unknown").trim();
}
