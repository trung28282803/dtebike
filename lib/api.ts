import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { OrderError } from "./orders";
import { UnauthorizedError } from "./auth";

// Chuyển exception thành response JSON thống nhất cho mọi Route Handler.
export function toErrorResponse(e: unknown) {
  if (e instanceof UnauthorizedError) return NextResponse.json({ error: e.message }, { status: 401 });

  if (e instanceof OrderError) {
    const status = e.code === "OUT_OF_STOCK" ? 409 : e.code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: e.message, code: e.code }, { status });
  }

  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2025") return NextResponse.json({ error: "Không tìm thấy bản ghi." }, { status: 404 });
    if (e.code === "P2003")
      return NextResponse.json(
        { error: "Bản ghi đang được tham chiếu ở nơi khác — không thể xóa." },
        { status: 409 }
      );
    if (e.code === "P2002") return NextResponse.json({ error: "Dữ liệu bị trùng." }, { status: 409 });
  }

  console.error(e);
  return NextResponse.json({ error: "Lỗi hệ thống." }, { status: 500 });
}

export class ValidationError extends OrderError {
  constructor(message: string) {
    super("INVALID", message);
  }
}

export const str = (v: unknown, field: string, max = 300) => {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) throw new ValidationError(`Thiếu ${field}.`);
  if (s.length > max) throw new ValidationError(`${field} quá dài.`);
  return s;
};

// Chuỗi không bắt buộc: undefined/null/"" → "".
export const optStr = (v: unknown, field: string, max = 2000) => {
  if (v == null) return "";
  if (typeof v !== "string") throw new ValidationError(`${field} không hợp lệ.`);
  const s = v.trim();
  if (s.length > max) throw new ValidationError(`${field} quá dài.`);
  return s;
};

export const int = (v: unknown, field: string, min: number, max: number) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max)
    throw new ValidationError(`${field} phải là số nguyên trong khoảng ${min}–${max}.`);
  return n;
};

// Số nguyên hoặc null (giá chưa niêm yết).
export const optInt = (v: unknown, field: string, min: number, max: number) => {
  if (v === null || v === undefined || v === "") return null;
  return int(v, field, min, max);
};

export const optFloat = (v: unknown, field: string, min: number, max: number) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max)
    throw new ValidationError(`${field} phải là số trong khoảng ${min}–${max}.`);
  return n;
};

export const bool = (v: unknown, fallback: boolean) => (v === undefined ? fallback : !!v);

export function enumOf<T extends string>(v: unknown, field: string, values: readonly T[]): T {
  if (typeof v !== "string" || !values.includes(v as T))
    throw new ValidationError(`${field} không hợp lệ.`);
  return v as T;
}

export const strList = (v: unknown, field: string, max = 50, itemMax = 200): string[] => {
  if (v == null) return [];
  if (!Array.isArray(v)) throw new ValidationError(`${field} phải là danh sách.`);
  if (v.length > max) throw new ValidationError(`${field} quá nhiều phần tử.`);
  return v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim().slice(0, itemMax))
    .filter(Boolean);
};

// URL không bắt buộc: rỗng → "", có giá trị thì phải là http(s).
export const optUrl = (v: unknown, field: string, max = 500) => {
  const s = optStr(v, field, max);
  if (!s) return "";
  if (!/^https?:\/\/[^\s]+$/i.test(s)) throw new ValidationError(`${field} phải là đường dẫn bắt đầu bằng https://.`);
  return s;
};

export const optEmail = (v: unknown, field = "email") => {
  const s = optStr(v, field, 120);
  if (!s) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new ValidationError(`${field} chưa hợp lệ.`);
  return s;
};

/* Bản đồ nhúng: admin dán nguyên thẻ <iframe …> từ Google Maps (Chia sẻ → Nhúng bản đồ)
   hoặc chỉ phần src. Chỉ chấp nhận domain Google để trang khách không nhúng được trang lạ. */
export const mapEmbed = (v: unknown, field = "bản đồ nhúng") => {
  const raw = optStr(v, field, 4000);
  if (!raw) return "";
  const m = /src=["']([^"']+)["']/i.exec(raw);
  const src = (m ? m[1] : raw).trim();
  if (!/^https:\/\/(www\.google\.[a-z.]+|maps\.google\.[a-z.]+)\/maps(\/embed)?[/?]/i.test(src))
    throw new ValidationError(`${field} phải là iframe/link nhúng từ Google Maps.`);
  return src;
};

// SĐT: chấp nhận VN (0xxxxxxxxx) và Hàn (010-xxxx-xxxx), có thể kèm +, khoảng trắng, gạch, chấm.
export const phoneStr = (v: unknown, field = "số điện thoại") => {
  const s = str(v, field, 30);
  const digits = s.replace(/[^\d]/g, "");
  if (digits.length < 8 || digits.length > 15) throw new ValidationError(`${field} chưa hợp lệ.`);
  return s;
};
