// Sinh slug từ tên tiếng Việt: bỏ dấu, đ → d, giữ a-z0-9 và gạch nối.
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Đảm bảo slug duy nhất: thử "slug", "slug-2", "slug-3"… cho đến khi `exists` trả false.
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  const root = slugify(base) || "item";
  let candidate = root;
  for (let i = 2; await exists(candidate); i++) candidate = `${root}-${i}`;
  return candidate;
}
