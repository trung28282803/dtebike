"use client";

import { useEffect, useRef, useState } from "react";
import { groupDigits } from "@/lib/format";

/* Ô nhập số hiển thị theo chuẩn 100,000,000.25 — nhóm nghìn bằng dấu phẩy,
   thập phân bằng dấu chấm.

   Vì chuỗi có dấu phẩy không hợp lệ với <input type="number">, ô này dùng type="text"
   + inputMode. Con trỏ được giữ đúng vị trí sau khi chèn/bỏ dấu phẩy (đếm số ký tự
   "thật" trước con trỏ rồi map lại sang chuỗi đã format). */

interface Props {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  /** Số chữ số thập phân cho phép. 0 = chỉ số nguyên (mặc định). */
  decimals?: number;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Nhãn nhỏ hiển thị bên phải trong ô, ví dụ "đ" hoặc "phút". */
  suffix?: string;
  "aria-describedby"?: string;
}

const RAW = /[\d.]/;

// Bỏ mọi ký tự không phải số/dấu chấm, chỉ giữ 1 dấu chấm, giới hạn số chữ số thập phân.
function sanitize(input: string, decimals: number): string {
  let s = input.replace(/[^\d.]/g, "");
  if (decimals <= 0) return s.replace(/\./g, "");
  const first = s.indexOf(".");
  if (first >= 0)
    s = s.slice(0, first + 1) + s.slice(first + 1).replace(/\./g, "").slice(0, decimals);
  return s;
}

function format(sanitized: string): string {
  if (sanitized === "") return "";
  const [int, frac] = sanitized.split(".");
  const head = groupDigits(int.replace(/^0+(?=\d)/, "") || "0");
  return frac === undefined ? head : `${head}.${frac}`;
}

const parse = (sanitized: string) => {
  const n = Number(sanitized);
  return Number.isFinite(n) ? n : 0;
};

export default function NumberInput({
  value,
  onChange,
  min,
  max,
  decimals = 0,
  id,
  placeholder,
  disabled,
  suffix,
  "aria-describedby": describedBy,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => format(sanitize(String(value ?? ""), decimals)));
  const [focused, setFocused] = useState(false);

  // Giá trị bị đổi từ bên ngoài (reset form, load lại dữ liệu) → đồng bộ lại phần hiển thị.
  // Không ghi đè khi đang gõ, để không phá con trỏ.
  useEffect(() => {
    if (focused) return;
    setText(format(sanitize(String(value ?? ""), decimals)));
  }, [value, decimals, focused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const caret = el.selectionStart ?? el.value.length;
    // Số ký tự "thật" (chữ số hoặc dấu chấm) đứng trước con trỏ.
    let rawBefore = 0;
    for (let i = 0; i < caret; i++) if (RAW.test(el.value[i])) rawBefore++;

    const sanitized = sanitize(el.value, decimals);
    const formatted = format(sanitized);
    setText(formatted);
    onChange(parse(sanitized));

    // Đặt lại con trỏ sau khi React render giá trị mới.
    requestAnimationFrame(() => {
      const node = ref.current;
      if (!node) return;
      let seen = 0;
      let pos = 0;
      while (pos < formatted.length && seen < rawBefore) {
        if (RAW.test(formatted[pos])) seen++;
        pos++;
      }
      node.setSelectionRange(pos, pos);
    });
  };

  // Kẹp min/max ở blur, không kẹp lúc đang gõ (gõ "1" khi min=10 sẽ bị nhảy số).
  const handleBlur = () => {
    setFocused(false);
    const sanitized = sanitize(text, decimals);
    if (sanitized === "") {
      const fallback = min ?? 0;
      setText(format(String(fallback)));
      onChange(fallback);
      return;
    }
    let n = parse(sanitized);
    if (min !== undefined && n < min) n = min;
    if (max !== undefined && n > max) n = max;
    setText(format(sanitize(String(n), decimals)));
    onChange(n);
  };

  const input = (
    <input
      ref={ref}
      id={id}
      type="text"
      inputMode={decimals > 0 ? "decimal" : "numeric"}
      autoComplete="off"
      value={text}
      placeholder={placeholder}
      disabled={disabled}
      aria-describedby={describedBy}
      onFocus={() => setFocused(true)}
      onChange={handleChange}
      onBlur={handleBlur}
      style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}
    />
  );

  if (!suffix) return input;
  return (
    <div className="numwrap">
      {input}
      <span className="numsuffix">{suffix}</span>
    </div>
  );
}
