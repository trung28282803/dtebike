"use client";

import { useEffect, useMemo, useState } from "react";
import type { BranchDTO, CatalogDTO, ProductDTO, VariantDTO } from "@/lib/catalog";
import { BRAND } from "@/lib/brand";
import { money, telHref, smsHref, STOCK_LABEL } from "@/lib/format";
import OrderModal, { type OrderDraft, type Ticket } from "./OrderModal";
import Lightbox from "./Lightbox";
import { PhoneIcon, MessageIcon, MapPinIcon, ClockIcon, BikeIcon, WrenchIcon, BrandIcon } from "./Icons";

/* Trang khách: hero → xe điện (lọc/tìm) → phụ kiện (theo nhóm) → dịch vụ → liên hệ (hệ thống chi nhánh).
   Toàn bộ nội dung chữ lấy từ settings/branches (admin sửa được), không hard-code. */

export default function Storefront({ catalog }: { catalog: CatalogDTO }) {
  const { settings, branches, categories, products, services } = catalog;
  const s = settings!;
  const cur = s.currency;
  // Một chi nhánh: hiện gọn trong thẻ liên hệ như cửa hàng đơn. Nhiều: lưới "Hệ thống cửa hàng".
  const single: BranchDTO | null = branches.length === 1 ? branches[0] : null;
  // Naver Map không nhúng iframe được: có toạ độ + server có key → ảnh Static Map (/api/map/:id);
  // không thì rơi về Google embed (nếu admin dán). Link mở bản đồ: link admin nhập, hoặc tìm địa chỉ trên Naver.
  const hasNaverImage = (b: BranchDTO) => catalog.naverMap && b.lat != null && b.lng != null;
  const mapHref = (b: BranchDTO) =>
    b.mapUrl || (b.address ? `https://map.naver.com/p/search/${encodeURIComponent(b.address)}` : "");
  const isNaverHref = (url: string) => /naver\.(com|me)\//i.test(url);
  const mapBranches = branches.filter((b) => hasNaverImage(b) || b.mapEmbedUrl);
  const [mapId, setMapId] = useState(mapBranches[0]?.id ?? "");
  const mapBranch = mapBranches.find((b) => b.id === mapId) ?? mapBranches[0];

  const vehicles = useMemo(() => products.filter((p) => p.kind === "VEHICLE"), [products]);
  const accessories = useMemo(() => products.filter((p) => p.kind === "ACCESSORY"), [products]);
  const vehicleCats = categories.filter((c) => c.kind === "VEHICLE");
  const accessoryCats = categories.filter((c) => c.kind === "ACCESSORY");

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  // Phiên bản đang chọn trên từng thẻ xe (mặc định: phiên bản đầu còn hàng).
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  // Sản phẩm đang xem ảnh phóng to.
  const [preview, setPreview] = useState<ProductDTO | null>(null);

  // Thanh dính đáy trên mobile cần thêm padding cho <body>.
  useEffect(() => {
    document.body.classList.add("has-mobilebar");
    return () => document.body.classList.remove("has-mobilebar");
  }, []);

  const shownVehicles = vehicles.filter((p) => {
    if (cat && p.categoryId !== cat) return false;
    const k = q.trim().toLowerCase();
    return !k || p.name.toLowerCase().includes(k) || p.brand.toLowerCase().includes(k);
  });

  const firstOrderable = (p: ProductDTO) =>
    p.variants.find((v) => v.stockStatus !== "OUT_OF_STOCK") ?? p.variants[0];
  const pickedVariant = (p: ProductDTO): VariantDTO | undefined =>
    p.variants.find((v) => v.id === picked[p.id]) ?? firstOrderable(p);

  const openOrder = (p: ProductDTO) => {
    const v = pickedVariant(p);
    setDraft({ type: "ORDER", product: p, variantId: v?.id ?? "" });
  };
  const openQuote = (p: ProductDTO) => {
    const v = p.variants.length === 1 ? p.variants[0] : undefined;
    setDraft({ type: v?.price != null ? "ORDER" : "QUOTE", product: p, variantId: v?.id ?? "" });
  };

  const smsGeneral = smsHref(s.phone, `[${s.name}] Tôi muốn được tư vấn về xe điện.`);

  // Nhóm phụ kiện theo danh mục (giữ thứ tự danh mục; không danh mục → "Khác").
  const accessoryGroups = useMemo(() => {
    const groups: { key: string; title: string; items: ProductDTO[] }[] = accessoryCats.map((c) => ({
      key: c.id,
      title: c.name,
      items: [],
    }));
    const other: ProductDTO[] = [];
    for (const p of accessories) {
      const g = groups.find((x) => x.key === p.categoryId);
      if (g) g.items.push(p);
      else other.push(p);
    }
    if (other.length) groups.push({ key: "other", title: "Khác", items: other });
    return groups.filter((g) => g.items.length);
  }, [accessories, accessoryCats]);

  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <nav className="topbar" aria-label="Điều hướng chính">
            <a className="brand" href="#top">
              <div className="mark">{BRAND.mark}</div>
              <div>
                <b>{s.name}</b>
                <span>{s.slogan || BRAND.taglineClient}</span>
              </div>
            </a>
            <div className="topnav">
              <a href="#products">Xe điện</a>
              <a href="#accessories">Phụ kiện</a>
              {services.length > 0 && <a href="#service">Dịch vụ</a>}
              <a href="#contact">Liên hệ</a>
              <a className="call" href={telHref(s.phone)}>
                <PhoneIcon size={16} /> {s.phoneDisplay}
              </a>
            </div>
          </nav>

          <section className="hero" id="top">
            <div>
              {s.heroEyebrow && <span className="eyebrow">{s.heroEyebrow}</span>}
              <h1>{s.heroTitle || `Xe điện ${s.name}`}</h1>
              {s.heroSubtitle && <p className="lead">{s.heroSubtitle}</p>}
              <div className="hero-actions">
                <a className="btn btn-primary" href="#products">
                  Xem sản phẩm
                </a>
                <a className="btn btn-outline" href={telHref(s.phone)}>
                  <PhoneIcon /> Gọi {s.phoneDisplay}
                </a>
              </div>
            </div>
            {s.heroHighlights.length > 0 && (
              <aside className="hero-panel">
                <strong>{s.name} hỗ trợ bạn</strong>
                <ul>
                  {s.heroHighlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </aside>
            )}
          </section>
        </div>
      </header>

      <main className="wrap">
        {/* ---------------- Xe điện ---------------- */}
        <section className="section" id="products">
          <div className="section-head">
            <div>
              <h2>Xe điện</h2>
              <p>Chọn mẫu xe và dung lượng pin phù hợp, rồi gửi yêu cầu đặt hàng. Cửa hàng sẽ gọi lại xác nhận.</p>
            </div>
            <div className="tools">
              <input
                className="search"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm mẫu xe…"
                aria-label="Tìm mẫu xe"
              />
            </div>
          </div>

          {vehicleCats.length > 1 && (
            <div className="catchips" role="group" aria-label="Lọc theo loại xe">
              <button className={cat === "" ? "on" : ""} onClick={() => setCat("")}>
                Tất cả ({vehicles.length})
              </button>
              {vehicleCats.map((c) => {
                const n = vehicles.filter((p) => p.categoryId === c.id).length;
                return (
                  <button key={c.id} className={cat === c.id ? "on" : ""} onClick={() => setCat(c.id)}>
                    {c.name} ({n})
                  </button>
                );
              })}
            </div>
          )}

          {shownVehicles.length === 0 ? (
            <div className="empty">Không tìm thấy mẫu xe phù hợp.</div>
          ) : (
            <div className="pgrid">
              {shownVehicles.map((p) => {
                const v = pickedVariant(p);
                const allOut = p.variants.length > 0 && p.variants.every((x) => x.stockStatus === "OUT_OF_STOCK");
                return (
                  <article className="pcard" key={p.id}>
                    <div className="pimg">
                      {p.isFeatured && <span className="ribbon">Nổi bật</span>}
                      <ProductImage p={p} onOpen={setPreview} />
                    </div>
                    <div className="pbody">
                      <h3>{p.name}</h3>
                      <p className="sub">
                        {p.brand && <span className="brandtag">{p.brand} · </span>}
                        {p.summary || "Chọn dung lượng pin phù hợp"}
                      </p>

                      {p.specs.length > 0 && (
                        <div className="specs">
                          {p.specs.slice(0, 4).map((sp) => (
                            <span key={sp.id}>
                              {sp.label}: {sp.value}
                            </span>
                          ))}
                        </div>
                      )}

                      {p.variants.length === 0 ? (
                        <div className="hint" style={{ marginBottom: 12 }}>
                          Chưa có phiên bản niêm yết — liên hệ để được tư vấn.
                        </div>
                      ) : (
                        <div className="variants" role="radiogroup" aria-label={`Phiên bản ${p.name}`}>
                          {p.variants.map((x) => {
                            const out = x.stockStatus === "OUT_OF_STOCK";
                            return (
                              <button
                                key={x.id}
                                type="button"
                                role="radio"
                                aria-checked={v?.id === x.id}
                                className={`vrow${v?.id === x.id ? " on" : ""}`}
                                disabled={out}
                                onClick={() => setPicked((m) => ({ ...m, [p.id]: x.id }))}
                              >
                                <span>
                                  <span className="vname">{x.name}</span>
                                  {x.stockStatus !== "IN_STOCK" && (
                                    <span className="vmeta">{STOCK_LABEL[x.stockStatus]}</span>
                                  )}
                                </span>
                                <span className="vprice">
                                  {money(x.price, cur)}
                                  {x.compareAtPrice != null && x.price != null && x.compareAtPrice > x.price && (
                                    <s>{money(x.compareAtPrice, cur)}</s>
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {p.variants.length === 0 ? (
                        <a className="btn btn-soft btn-block" href={telHref(s.phone)}>
                          <PhoneIcon /> Liên hệ tư vấn
                        </a>
                      ) : allOut ? (
                        <button className="btn btn-ghost btn-block" disabled>
                          Tạm hết hàng
                        </button>
                      ) : (
                        <button className="btn btn-brand btn-block" onClick={() => openOrder(p)}>
                          Đặt hàng{v ? ` · ${v.name}` : ""}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ---------------- Phụ kiện ---------------- */}
        {accessories.length > 0 && (
          <section className="section" id="accessories">
            <div className="section-head">
              <div>
                <h2>Phụ kiện &amp; phụ tùng ({accessories.length})</h2>
                <p>Món nào chưa niêm yết giá, bấm “Hỏi giá” — cửa hàng sẽ báo lại qua điện thoại.</p>
              </div>
            </div>

            {accessoryGroups.map((g) => (
              <div key={g.key}>
                {accessoryGroups.length > 1 && <div className="agroup">{g.title}</div>}
                <div className="agrid">
                  {g.items.map((p) => {
                    const v = p.variants[0];
                    const price = p.variants.length === 1 ? v?.price ?? null : null;
                    const catName = accessoryCats.find((c) => c.id === p.categoryId)?.name;
                    return (
                      <article className="acard" key={p.id}>
                        <div className="aimg">
                          <ProductImage p={p} onOpen={setPreview} />
                        </div>
                        <div className="abody">
                          <h3>{p.name}</h3>
                          <span className="cat">{p.summary || catName || ""}</span>
                          <span className={`aprice${price == null ? " ask" : ""}`}>
                            {p.variants.length > 1 ? "Nhiều phiên bản" : money(price, cur)}
                          </span>
                          <button className="btn btn-soft" onClick={() => openQuote(p)}>
                            {price == null ? (
                              <>
                                <MessageIcon size={15} /> Hỏi giá / đặt mua
                              </>
                            ) : (
                              "Đặt mua"
                            )}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ---------------- Dịch vụ ---------------- */}
        {services.length > 0 && (
          <section className="section" id="service">
            <div className="section-head">
              <div>
                <h2>Dịch vụ</h2>
              </div>
            </div>
            <div className="svc-grid">
              {services.map((sv) => (
                <article className="svc" key={sv.id}>
                  <div className="icon" aria-hidden="true">
                    {sv.icon || "•"}
                  </div>
                  <h3>{sv.title}</h3>
                  <p>{sv.description}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ---------------- Liên hệ ---------------- */}
        <section className="section" id="contact">
          <div className="section-head">
            <div>
              <h2>Liên hệ &amp; bảo hành</h2>
            </div>
          </div>
          <div className="contact-grid">
            <div className="contact-card">
              <h3>{s.name}</h3>
              <dl>
                <dt>{branches.length > 1 ? "Hotline" : "Điện thoại"}</dt>
                <dd>
                  <a className="big" href={telHref(s.phone)}>
                    {s.phoneDisplay}
                  </a>
                </dd>
                {single?.address && (
                  <>
                    <dt>Địa chỉ</dt>
                    <dd>
                      {mapHref(single) ? (
                        <a href={mapHref(single)} target="_blank" rel="noreferrer">
                          {single.address}
                        </a>
                      ) : (
                        single.address
                      )}
                      {single.addressNote && (
                        <div className="hint" style={{ marginTop: 2 }}>
                          {single.addressNote}
                        </div>
                      )}
                    </dd>
                  </>
                )}
                {single?.openHours && (
                  <>
                    <dt>Giờ mở cửa</dt>
                    <dd>{single.openHours}</dd>
                  </>
                )}
                {branches.length > 1 && (
                  <>
                    <dt>Cửa hàng</dt>
                    <dd>
                      {branches.length} chi nhánh — xem danh sách bên dưới, hoặc gọi hotline để được hướng dẫn chi nhánh gần
                      bạn.
                    </dd>
                  </>
                )}
                {s.shippingNote && (
                  <>
                    <dt>Giao hàng</dt>
                    <dd>{s.shippingNote}</dd>
                  </>
                )}
              </dl>
              <div className="contact-actions">
                <a className="btn btn-brand" href={telHref(s.phone)}>
                  <PhoneIcon /> Gọi ngay
                </a>
                <a className="btn btn-soft" href={smsGeneral}>
                  <MessageIcon /> Nhắn tin
                </a>
                {s.messengerUrl && (
                  <a className="btn btn-ghost" href={s.messengerUrl} target="_blank" rel="noreferrer">
                    <BrandIcon name="messenger" /> Messenger
                  </a>
                )}
                {s.zaloUrl && (
                  <a className="btn btn-ghost" href={s.zaloUrl} target="_blank" rel="noreferrer">
                    <BrandIcon name="zalo" /> Zalo
                  </a>
                )}
                {s.kakaoUrl && (
                  <a className="btn btn-ghost" href={s.kakaoUrl} target="_blank" rel="noreferrer">
                    <BrandIcon name="kakao" /> KakaoTalk
                  </a>
                )}
                {s.facebookUrl && (
                  <a className="btn btn-ghost" href={s.facebookUrl} target="_blank" rel="noreferrer">
                    <BrandIcon name="facebook" /> Facebook
                  </a>
                )}
                {s.tiktokUrl && (
                  <a className="btn btn-ghost" href={s.tiktokUrl} target="_blank" rel="noreferrer">
                    <BrandIcon name="tiktok" /> TikTok
                  </a>
                )}
                {s.email && (
                  <a className="btn btn-ghost" href={`mailto:${s.email}`}>
                    <BrandIcon name="gmail" /> Email
                  </a>
                )}
              </div>
            </div>

            <div className="contact-card">
              <h3>Bảo hành dự kiến</h3>
              <div className="warranty">
                <div>
                  <div className="v">{s.warrantyFrameMonths}</div>
                  <div className="k">tháng · khung</div>
                </div>
                <div>
                  <div className="v">{s.warrantyBatteryMonths}</div>
                  <div className="k">tháng · pin</div>
                </div>
                <div>
                  <div className="v">{s.warrantyAccessoryMonths}</div>
                  <div className="k">tháng · phụ kiện</div>
                </div>
              </div>
              <p className="hint" style={{ marginTop: 12 }}>
                Áp dụng theo điều kiện thực tế của cửa hàng. Vui lòng hỏi lại khi nhận hàng.
              </p>
            </div>
          </div>

          {branches.length > 1 && (
            <>
              <div className="agroup" id="branches">
                Hệ thống cửa hàng ({branches.length})
              </div>
              <div className="branch-grid">
                {branches.map((b) => (
                  <article className="branch-card" key={b.id}>
                    <h3>
                      <MapPinIcon size={16} /> {b.name}
                    </h3>
                    {b.address && (
                      <p className="addr">
                        {mapHref(b) ? (
                          <a href={mapHref(b)} target="_blank" rel="noreferrer">
                            {b.address}
                          </a>
                        ) : (
                          b.address
                        )}
                      </p>
                    )}
                    {b.addressNote && <p className="hint">{b.addressNote}</p>}
                    {b.phoneDisplay && (
                      <p className="meta">
                        <PhoneIcon size={14} />
                        <a href={telHref(b.phone)}>{b.phoneDisplay}</a>
                      </p>
                    )}
                    {b.openHours && (
                      <p className="meta">
                        <ClockIcon size={14} />
                        <span>{b.openHours}</span>
                      </p>
                    )}
                    <div className="acts">
                      <a className="btn btn-soft" href={telHref(b.phone || s.phone)}>
                        <PhoneIcon size={15} /> Gọi
                      </a>
                      {mapHref(b) && (
                        <a className="btn btn-ghost" href={mapHref(b)} target="_blank" rel="noreferrer">
                          <BrandIcon name={isNaverHref(mapHref(b)) ? "naver" : "maps"} size={18} /> Chỉ đường
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {mapBranch && (
            <>
              {mapBranches.length > 1 && (
                <div className="catchips" style={{ marginTop: 16 }} role="group" aria-label="Chọn bản đồ chi nhánh">
                  {mapBranches.map((b) => (
                    <button key={b.id} className={mapBranch.id === b.id ? "on" : ""} onClick={() => setMapId(b.id)}>
                      {b.name}
                    </button>
                  ))}
                </div>
              )}
              {hasNaverImage(mapBranch) ? (
                <a
                  className="maplink"
                  style={{ marginTop: mapBranches.length > 1 ? 10 : 16 }}
                  href={mapHref(mapBranch)}
                  target="_blank"
                  rel="noreferrer"
                  title="Mở Naver Map"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="mapimg"
                    src={`/api/map/${mapBranch.id}`}
                    alt={`Bản đồ ${single ? s.name : mapBranch.name}`}
                    loading="lazy"
                  />
                </a>
              ) : (
                <iframe
                  className="mapframe"
                  style={{ marginTop: mapBranches.length > 1 ? 10 : 16 }}
                  src={mapBranch.mapEmbedUrl}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Bản đồ ${single ? s.name : mapBranch.name}`}
                />
              )}
            </>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-grid">
            <div>
              <p>
                <b style={{ color: "#fff", fontSize: 16 }}>{s.name}</b>
                {s.slogan ? ` — ${s.slogan}` : ""}
              </p>
              {branches
                .filter((b) => b.address)
                .map((b) => (
                  <p className="iconline" key={b.id}>
                    <MapPinIcon size={16} />
                    {mapHref(b) ? (
                      <a href={mapHref(b)} target="_blank" rel="noreferrer">
                        {single ? "" : `${b.name}: `}
                        {b.address}
                      </a>
                    ) : (
                      <span>
                        {single ? "" : `${b.name}: `}
                        {b.address}
                      </span>
                    )}
                  </p>
                ))}
              {single?.openHours && (
                <p className="iconline">
                  <ClockIcon size={16} />
                  <span>{single.openHours}</span>
                </p>
              )}
            </div>
            <div>
              <h4>Liên hệ</h4>
              <ul>
                <li>
                  <a href={telHref(s.phone)}>
                    <span className="ico">
                      <PhoneIcon size={13} />
                    </span>
                    {s.phoneDisplay}
                  </a>
                </li>
                {s.email && (
                  <li>
                    <a href={`mailto:${s.email}`}>
                      <BrandIcon name="gmail" size={22} />
                      {s.email}
                    </a>
                  </li>
                )}
                {s.messengerUrl && (
                  <li>
                    <a href={s.messengerUrl} target="_blank" rel="noreferrer">
                      <BrandIcon name="messenger" size={22} />
                      Messenger
                    </a>
                  </li>
                )}
                {s.zaloUrl && (
                  <li>
                    <a href={s.zaloUrl} target="_blank" rel="noreferrer">
                      <BrandIcon name="zalo" size={22} />
                      Zalo
                    </a>
                  </li>
                )}
                {s.kakaoUrl && (
                  <li>
                    <a href={s.kakaoUrl} target="_blank" rel="noreferrer">
                      <BrandIcon name="kakao" size={22} />
                      KakaoTalk
                    </a>
                  </li>
                )}
              </ul>
            </div>
            <div>
              <h4>Theo dõi</h4>
              <ul>
                {s.facebookUrl && (
                  <li>
                    <a href={s.facebookUrl} target="_blank" rel="noreferrer">
                      <BrandIcon name="facebook" size={22} />
                      Facebook
                    </a>
                  </li>
                )}
                {s.tiktokUrl && (
                  <li>
                    <a href={s.tiktokUrl} target="_blank" rel="noreferrer">
                      <BrandIcon name="tiktok" size={22} />
                      TikTok
                    </a>
                  </li>
                )}
                {single && mapHref(single) && (
                  <li>
                    <a href={mapHref(single)} target="_blank" rel="noreferrer">
                      <BrandIcon name={isNaverHref(mapHref(single)) ? "naver" : "maps"} size={22} />
                      {isNaverHref(mapHref(single)) ? "Chỉ đường Naver Map" : "Chỉ đường Google Maps"}
                    </a>
                  </li>
                )}
                {branches.length > 1 && (
                  <li>
                    <a href="#branches">
                      <span className="ico">
                        <MapPinIcon size={13} />
                      </span>
                      Hệ thống cửa hàng
                    </a>
                  </li>
                )}
                <li>
                  <a href="#products">
                    <span className="ico">
                      <BikeIcon size={13} />
                    </span>
                    Xe điện
                  </a>
                </li>
                <li>
                  <a href="#accessories">
                    <span className="ico">
                      <WrenchIcon size={13} />
                    </span>
                    Phụ kiện
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="fine">
            © {new Date().getFullYear()} {s.name}. {s.fineprint}
          </div>
        </div>
      </footer>

      {/* Thanh dính đáy — chỉ hiện trên mobile (CSS). */}
      <div className="mobilebar">
        <a className="btn btn-brand" href={telHref(s.phone)}>
          <PhoneIcon /> Gọi {s.phoneDisplay}
        </a>
        <a className="btn btn-soft" href={smsGeneral}>
          <MessageIcon /> Nhắn tin
        </a>
      </div>

      {preview && <Lightbox product={preview} onClose={() => setPreview(null)} />}

      {draft && (
        <OrderModal
          draft={draft}
          settings={s}
          branches={branches}
          onClose={() => setDraft(null)}
          onDone={(t) => {
            setDraft(null);
            setTicket(t);
          }}
        />
      )}

      {ticket && (
        <div className="ovl" role="dialog" aria-modal="true" onClick={() => setTicket(null)}>
          <div className="ticket" onClick={(e) => e.stopPropagation()}>
            <div className="top">
              <h2>{ticket.type === "QUOTE" ? "Đã gửi yêu cầu báo giá" : "Đã gửi yêu cầu đặt hàng"}</h2>
              <div className="code">{ticket.code}</div>
              <small>Mã yêu cầu — lưu lại để tra cứu</small>
            </div>
            <div className="body">
              <dl>
                <dt>Sản phẩm</dt>
                <dd>
                  {ticket.productName}
                  {ticket.variantName ? ` · ${ticket.variantName}` : ""}
                  {ticket.quantity > 1 ? ` × ${ticket.quantity}` : ""}
                </dd>
                <dt>Giá</dt>
                <dd className="tabnum">{ticket.total == null ? "Cửa hàng sẽ báo" : money(ticket.total, cur)}</dd>
                {ticket.branchName && (
                  <>
                    <dt>Cửa hàng</dt>
                    <dd>{ticket.branchName}</dd>
                  </>
                )}
                <dt>Khách</dt>
                <dd>
                  {ticket.name} · {ticket.phone}
                </dd>
              </dl>
              <p className="thanks">{BRAND.thanks}</p>
              <div className="acts">
                <a className="btn btn-brand" href={smsHref(s.phone, ticket.smsBody)}>
                  <MessageIcon /> Gửi SMS kèm mã cho cửa hàng
                </a>
                <a className="btn btn-soft" href={telHref(s.phone)}>
                  <PhoneIcon /> Gọi {s.phoneDisplay}
                </a>
                <button className="btn btn-ghost" onClick={() => setTicket(null)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Ảnh sản phẩm: lỗi tải → ô dự phòng có tên, không để khung trống. Bấm vào ảnh → xem ảnh đủ (Lightbox).
function ProductImage({ p, onOpen }: { p: ProductDTO; onOpen: (p: ProductDTO) => void }) {
  const [broken, setBroken] = useState(false);
  if (!p.imageUrl || broken)
    return (
      <div className="fallback">
        <b aria-hidden="true">{p.kind === "VEHICLE" ? <BikeIcon size={40} strokeWidth={1.5} /> : <WrenchIcon size={40} strokeWidth={1.5} />}</b>
        {p.name}
      </div>
    );
  // div role=button thay vì <button>: Safari không resolve height:100% cho con của <button>,
  // ảnh sẽ nở theo kích thước gốc và bị .pimg (overflow hidden) cắt mất.
  return (
    <div
      className="imgbtn"
      role="button"
      tabIndex={0}
      aria-label={`Xem ảnh ${p.name}`}
      title="Xem ảnh đủ"
      onClick={() => onOpen(p)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(p);
        }
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.imageUrl} alt={p.imageAlt || p.name} loading="lazy" onError={() => setBroken(true)} />
    </div>
  );
}
