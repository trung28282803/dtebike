# Dtebike — Xe điện Dũng Trần — Trang bán hàng & Quản trị

Một repo Next.js (App Router) làm cả FE và BE: trang khách xem xe / phụ kiện / gửi yêu cầu
đặt hàng + trang quản trị. Prisma ORM, Postgres trên Neon, deploy Vercel.
**Không dùng function/trigger trong DB** — toàn bộ DDL nằm ở `prisma/migrations`, mọi
truy vấn qua Prisma ORM.

Khác bản tham chiếu (trang tĩnh chỉ mở app SMS): ở đây mọi yêu cầu được **lưu vào DB**
với mã `DT…`, cửa hàng xử lý trên admin; khách vẫn có nút gửi SMS kèm mã sau khi gửi.

---

## 1. Cấu trúc

```
app/
  page.tsx                     Trang khách (Server Component, đọc danh mục qua Prisma)
  _components/Storefront.tsx   Hero · xe (lọc/tìm) · phụ kiện (theo nhóm) · dịch vụ · liên hệ
  _components/OrderModal.tsx   Form đặt hàng / hỏi giá → POST /api/orders
  layout.tsx  globals.css      Layout + hệ thiết kế (xanh ngọc / cam)
  admin/
    login/                     Đăng nhập (mật khẩu env + JWT httpOnly cookie)
    page.tsx                   Trang quản trị (kiểm tra session ở server)
    _components/               AdminShell + 7 tab: Đơn hàng, Xe điện, Phụ kiện, Danh mục, Dịch vụ, Chi nhánh, Cửa hàng
  api/
    catalog                    GET  — danh mục công khai
    orders                     POST — khách gửi yêu cầu (rate-limit theo IP) · GET (admin) — danh sách + lọc (status/type/branch/q)
    orders/[id]                PATCH (admin) — { status, note } | { adminNote }
    admin/login · logout       POST
    admin/categories[/id]      POST · PATCH · DELETE
    admin/products[/id]        POST · PATCH · DELETE   (kèm variants[] + specs[], thay toàn bộ)
    admin/services[/id]        POST · PATCH · DELETE
    admin/branches[/id]        POST · PATCH · DELETE — chi nhánh (địa chỉ, SĐT, giờ mở cửa, bản đồ)
    admin/settings             PUT  — cấu hình chung của chuỗi (bản ghi đơn)
    admin/upload               POST — upload ảnh lên Vercel Blob (multipart)
    map/[id]                   GET  — ảnh Naver Static Map của chi nhánh (công khai, cần NAVER_MAP_*)
lib/
  orders.ts                    ★ Tạo đơn (đối chiếu DB, snapshot giá, mã DT…) + chuyển trạng thái
  order-status.ts              Luồng trạng thái — không import Prisma, dùng được ở client
  catalog.ts                   Loader danh mục cho trang khách / admin (DTO phẳng)
  product-input.ts             Validate body sản phẩm (dùng chung POST/PATCH)
  branch-input.ts              Validate body chi nhánh (dùng chung POST/PATCH)
  api.ts                       Validate input + map exception → HTTP status
  auth.ts / auth-token.ts      Auth Node runtime / Edge runtime
  rate-limit.ts                Giới hạn tần suất POST /api/orders (in-memory, theo IP)
  prisma.ts                    PrismaClient lazy + Neon adapter (cổng 443)
  format.ts · slug.ts · brand.ts
prisma/
  schema.prisma                Mô hình dữ liệu
  migrations/                  DDL (sinh bằng `prisma migrate diff`)
  seed.ts                      Dữ liệu demo: 6 xe, 21 phụ kiện, 12 danh mục, 3 dịch vụ, 4 chi nhánh, cấu hình chuỗi
public/images/                 Ảnh xe (vehicles/) và phụ kiện (accessories/)
scripts/
  apply-migrations.ts          npm run db:apply — áp migration qua cổng 443
  probe.ts                     npm run db:probe — kiểm tra kết nối + transaction
  smoke-order.ts               npm run db:smoke — test 5 quy tắc nghiệp vụ đơn hàng trên DB thật
middleware.ts                  Chặn /admin/* nếu chưa đăng nhập
```

---

## 2. Mô hình dữ liệu

| Bảng | Vai trò |
|---|---|
| `shop_settings` | **Bản ghi đơn** (`id = "default"`): phần chung của cả chuỗi — tên, hotline, mạng xã hội, hero, bảo hành, tiền tệ. Mọi chữ trên trang khách sửa ở admin |
| `shop_branches` | **Chi nhánh**: tên, SĐT riêng (rỗng → dùng hotline), địa chỉ, giờ mở cửa, link bản đồ (Naver/Google), toạ độ `lat/lng` (ảnh Naver Static Map), Google embed tùy chọn, `sortOrder` (đứng đầu = chi nhánh chính), ẩn/hiện. 1 chi nhánh → trang khách hiện như cửa hàng đơn; ≥ 2 → lưới "Hệ thống cửa hàng" + chọn bản đồ |
| `categories` | Danh mục, tách theo `kind` (VEHICLE / ACCESSORY) |
| `products` | Xe hoặc phụ kiện: tên, slug, thương hiệu, ảnh, mô tả, nổi bật, ẩn/hiện |
| `product_variants` | Phiên bản bán được. Xe: mỗi dung lượng pin một dòng (`voltageV`, `capacityAh`, `price`). Phụ kiện: thường 1 dòng “Tiêu chuẩn”; **`price = null` nghĩa là “hỏi giá”**. `stockStatus`: có sẵn / đặt trước / hết hàng. `UNIQUE(productId, name)` |
| `product_specs` | Thông số kỹ thuật nhãn–giá trị, mỗi xe một bộ khác nhau |
| `shop_services` | Các ô “Dịch vụ” (tư vấn pin, sửa chữa, giao hàng) |
| `orders` | Yêu cầu của khách: `type` ORDER (đặt mua) / QUOTE (hỏi giá), `status`, snapshot `totalPrice` + `currency`, `adminNote`. `branchId` (FK `ON DELETE SET NULL`) + snapshot `branchName`: chi nhánh khách chọn — chuỗi chỉ có 1 chi nhánh thì tự gán |
| `order_items` | Dòng hàng — **snapshot** `productName`, `variantName`, `unitPrice`; FK `productId`/`variantId` `ON DELETE SET NULL` nên xóa sản phẩm không mất lịch sử đơn |
| `order_status_logs` | Nhật ký đổi trạng thái (từ → đến, ghi chú, thời điểm) |

### Luồng đơn hàng

```
NEW ──► CONTACTED ──► CONFIRMED ──► DELIVERED
 │          │            │
 └──────────┴────────────┴──► CANCELLED
```

- `createOrder()` ([lib/orders.ts](lib/orders.ts)) **không tin FE**: tra lại sản phẩm/phiên bản
  trong DB, chặn phiên bản đã ẩn hoặc `OUT_OF_STOCK` (409), tính tổng từ giá trong DB,
  `totalPrice = null` nếu có dòng chưa niêm yết. Mã `DT + yymmdd + 4 số`, trùng (P2002)
  thì sinh lại.
- Đơn chỉ là *yêu cầu* — không trừ tồn kho. Cửa hàng gọi khách rồi chuyển trạng thái;
  mỗi lần chuyển ghi một dòng `order_status_logs`. DELIVERED/CANCELLED là trạng thái cuối.
- `POST /api/orders` có rate-limit 8 yêu cầu / 10 phút / IP (in-memory, đủ chặn script
  đơn giản; cần chặt hơn thì dùng Upstash/Redis).
- **Chi nhánh:** form đặt hàng hiện ô "Cửa hàng gần bạn" khi có ≥ 2 chi nhánh đang hoạt động
  (không bắt buộc). Server kiểm tra chi nhánh tồn tại và đang hoạt động (404 nếu không), ghi
  snapshot `branchName`. Admin lọc đơn theo chi nhánh (`?branch=<id>` hoặc `none`).

### Bản đồ: Naver Map (khách ở Hàn Quốc)

Naver Map **không cho nhúng iframe** như Google, nên có 2 mức:

1. **Link** (mặc định, không cần key): nút "Chỉ đường" mở `mapUrl` admin dán (Naver Map →
   공유 → link `map.naver.com/p/…` hoặc `naver.me/…`); để trống thì tự mở
   `map.naver.com/p/search/<địa chỉ>`.
2. **Ảnh Naver Static Map** (tùy chọn): đặt `NAVER_MAP_CLIENT_ID` + `NAVER_MAP_CLIENT_SECRET`
   (NCP Console → Maps → Application, bật Static Map) và nhập `lat/lng` cho chi nhánh → trang
   khách hiện ảnh bản đồ có marker qua `GET /api/map/:branchId` ([lib/naver-map.ts](lib/naver-map.ts)
   proxy, secret không ra trình duyệt, cache 1 ngày). Chưa có key → bỏ qua, rơi về Google embed
   nếu admin dán. Miễn phí cho tài khoản NCP chính (primary account) — xem bảng giá NCP trước khi bật.

### Trang khách lấy gì từ DB

Tất cả: tên/slogan/hotline, khối hero + 3 điểm nổi bật, danh sách xe (lọc theo danh
mục, tìm tên) với từng phiên bản pin + giá, phụ kiện gộp theo danh mục, ô dịch vụ, danh
sách chi nhánh (địa chỉ, SĐT, giờ mở cửa, bản đồ), bảo hành, dòng cuối trang. Admin đổi là
trang khách đổi theo (trang là `force-dynamic`).

---

## 3. Setup database trên Neon

### 3.1. Tạo project

1. <https://console.neon.tech> → **Create project**: tên `dtebike`, region
   **AWS ap-southeast-1 (Singapore)** (chọn cùng region Vercel), Postgres 17.
2. Hộp **Connect** → chọn **.env** → copy nguyên khối biến môi trường.

### 3.2. Hai connection string

| Toggle Connection pooling | Hostname | Dùng cho | Biến env |
|---|---|---|---|
| **Bật** | `ep-xxxx-pooler.…` | App serverless | `DATABASE_URL` |
| **Tắt** | `ep-xxxx.…` | `prisma migrate` | `DATABASE_URL_UNPOOLED` |

Bắt buộc có cả hai; tên biến đúng chuẩn Neon nên Vercel↔Neon integration tự sync.

### 3.3. Kết nối qua cổng 443

Nhiều mạng doanh nghiệp chặn outbound TCP 5432. Kiểm tra:

```powershell
Test-NetConnection <host>.neon.tech -Port 5432   # False = bị chặn
```

Dự án đã cấu hình sẵn đi qua **Neon serverless driver (HTTPS/WSS, cổng 443)**:
[lib/prisma.ts](lib/prisma.ts) dùng `PrismaNeon` adapter cho app/seed/script, và
`npm run db:apply` áp migration qua query engine rồi tự ghi `_prisma_migrations` đúng
định dạng Prisma. Ở mạng không chặn, `prisma migrate dev/deploy` chạy bình thường.

### 3.4. Cấu hình local

```bash
npm install
cp .env.example .env     # dán 2 chuỗi Neon + đặt ADMIN_PASSWORD, AUTH_SECRET (≥ 32 ký tự)
```

Sinh `AUTH_SECRET`: `openssl rand -base64 48` hoặc PowerShell
`[Convert]::ToBase64String((1..48 | % { Get-Random -Max 256 }))`.

### 3.5. Tạo bảng + seed + kiểm tra

```bash
npm run db:probe    # kết nối + interactive transaction OK chưa
npm run db:apply    # áp prisma/migrations qua cổng 443
npm run db:seed     # ⚠️ xóa sạch rồi ghi dữ liệu demo
npm run db:smoke    # 5 test nghiệp vụ đơn hàng trên DB thật, tự dọn
npm run dev         # http://localhost:3000  ·  admin: /admin
```

`db:smoke` phải in ra:

```
✓ đặt mua: DT2xxxxx-xxxx, tổng …
✓ hỏi giá: DT2xxxxx-xxxx, chưa có giá
✓ chặn hết hàng: … đã hết hàng.
✓ chặn hủy đơn đã giao: Không chuyển được từ "DELIVERED" sang "CANCELLED".
✓ ghi đủ 4 dòng nhật ký trạng thái
✓ xóa sản phẩm vẫn giữ snapshot dòng đơn
✓ chặn chi nhánh không tồn tại: Chi nhánh không còn hoạt động.
✓ xóa chi nhánh vẫn giữ tên chi nhánh trên đơn
Tất cả OK.
```

Khi **đổi schema**: sửa `schema.prisma` → sinh SQL offline rồi áp:

```bash
npx prisma migrate diff --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<ts>_ten/migration.sql
npm run db:apply
```

(hoặc `npx prisma migrate dev --name ten` ở mạng không chặn 5432).

---

## 4. Deploy lên Vercel (Hobby, free)

1. `git init && git add . && git commit -m "init"` → push lên GitHub.
2. Vercel → **Add New → Project** → import repo (tự nhận Next.js).
3. **Environment Variables** (Production + Preview): `DATABASE_URL`,
   `DATABASE_URL_UNPOOLED`, `ADMIN_PASSWORD`, `AUTH_SECRET`. Dùng Vercel↔Neon
   integration thì hai biến DB tự sync.
4. **Settings → Functions → Region**: **Singapore (sin1)** cho khớp Neon.
5. Deploy (`npm run build` đã có `prisma generate`).
6. Áp migration + seed production một lần từ máy local với `.env` trỏ production:
   `npm run db:apply` rồi `npm run db:seed` (chỉ lần đầu — seed **xóa sạch** bảng).
7. Vào `/admin` → tab **Cửa hàng**: sửa tên, hotline, hero; tab **Chi nhánh**: địa chỉ,
   SĐT, giờ mở cửa, bản đồ từng cửa hàng; tab **Xe điện / Phụ kiện**: cập nhật giá thật.

### Ảnh sản phẩm — upload qua Vercel Blob

Vercel không có đĩa ghi được, nên ảnh upload từ admin đi vào **Vercel Blob** (gói Hobby
miễn phí 1 GB). Bật một lần:

1. Vercel → project → **Storage → Create Database → Blob** → đặt tên → **Connect** vào
   project (cả Production + Preview). Vercel tự thêm `BLOB_READ_WRITE_TOKEN`.
2. **Redeploy** một lần để function nhận biến mới.
3. Chạy local: copy token đó (Settings → Environment Variables) vào `.env`.

Sau đó trong admin → Sửa sản phẩm → **📷 Tải ảnh lên**. Trình duyệt tự thu nhỏ ảnh về
≤ 1600px / WebP (~200–400 KB) trước khi gửi ([lib/image-client.ts](lib/image-client.ts));
API `POST /api/admin/upload` kiểm tra đăng nhập, loại file (JPG/PNG/WebP) và dung lượng
≤ 4 MB rồi trả về URL public để lưu vào `products.imageUrl`.

Ảnh demo ban đầu vẫn nằm trong `public/images/…` (commit cùng code) — hai cách dùng song
song được. Ảnh cũ trên Blob **không tự xóa** khi đổi ảnh; dọn ở Vercel → Storage khi cần.

---

## 5. Gỡ lỗi build trên Vercel

- **`Thiếu biến môi trường DATABASE_URL` khi build** — [lib/prisma.ts](lib/prisma.ts)
  khởi tạo client lazy qua `Proxy`; đừng đổi thành `new PrismaClient()` ở top-level.
- **Tự tái hiện Vercel trước khi push:**
  ```bash
  git clone . /tmp/vtest && cd /tmp/vtest && npm ci
  env -u DATABASE_URL -u DATABASE_URL_UNPOOLED npm run build   # phải pass
  ```

## 6. Bảo mật & vận hành

- Auth admin: một `ADMIN_PASSWORD` (so sánh timing-safe) + JWT HS256 cookie `httpOnly`
  `sameSite=lax`, hạn 7 ngày; cookie tên `dt_admin`. Không phân role.
- `middleware.ts` chặn trang `/admin/*`; mỗi API admin còn tự gọi `requireAdmin()`.
- API công khai: `GET /api/catalog`, `POST /api/orders` (có rate-limit).
- Trước production: đổi `ADMIN_PASSWORD` + `AUTH_SECRET`, cập nhật giá/phân loại thật.
- Tên, SĐT, địa chỉ khách là **PII** (NĐ 13/2023 nếu phục vụ khách tại VN) — cần thông
  báo xử lý dữ liệu và chính sách xóa đơn cũ; chưa nằm trong phạm vi bản này.

## 7. Chưa nằm trong phạm vi

Giỏ hàng nhiều sản phẩm trong một đơn (API đã hỗ trợ `items[]`
nhưng UI gửi 1 dòng), thanh toán online, thông báo SMS/Zalo/Kakao tự động, nhiều tài
khoản admin, tồn kho theo số lượng.
