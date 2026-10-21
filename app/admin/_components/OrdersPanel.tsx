"use client";

import { useCallback, useEffect, useState } from "react";
import type { OrderStatus } from "@prisma/client";
import { money, fmtDateTime, ORDER_STATUS_LABEL, ORDER_TYPE_LABEL, telHref } from "@/lib/format";
import { nextStatuses } from "@/lib/order-status";
import { BRAND } from "@/lib/brand";
import { StatusBadge, apiCall, Modal } from "./ui";
import Select from "@/components/Select";
import { useDialog } from "@/components/Dialog";

interface Item {
  id: string;
  productName: string;
  variantName: string;
  unitPrice: number | null;
  quantity: number;
}
interface Log {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string;
  createdAt: string;
}
interface Order {
  id: string;
  code: string;
  type: "ORDER" | "QUOTE";
  status: OrderStatus;
  customerName: string;
  phone: string;
  address: string;
  note: string;
  totalPrice: number | null;
  currency: string;
  adminNote: string;
  createdAt: string;
  items: Item[];
  logs: Log[];
}

const STATUSES: OrderStatus[] = ["NEW", "CONTACTED", "CONFIRMED", "DELIVERED", "CANCELLED"];

export default function OrdersPanel({
  currency,
  onNewCount,
}: {
  currency: string;
  onNewCount?: (n: number) => void;
}) {
  const dialog = useDialog();
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [detail, setDetail] = useState<Order | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      if (status) qs.set("status", status);
      if (type) qs.set("type", type);
      if (q.trim()) qs.set("q", q.trim());
      const r = await fetch(`/api/orders?${qs}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Không tải được danh sách.");
      setRows(d.orders || []);
    } catch (e: any) {
      setError(e?.message || "Không tải được danh sách.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [status, type, q]);

  useEffect(() => {
    load();
  }, [load]);

  // Đếm đơn mới cho badge trên tab (độc lập với bộ lọc).
  useEffect(() => {
    (async () => {
      const r = await fetch("/api/orders?status=NEW", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      onNewCount?.(d.orders?.length ?? 0);
    })();
  }, [rows, onNewCount]);

  const changeStatus = async (o: Order, to: OrderStatus) => {
    let note = "";
    if (to === "CANCELLED") {
      const ok = await dialog.confirm({
        title: "Hủy đơn?",
        message: (
          <>
            Đơn <b>{o.code}</b> sẽ chuyển sang <b>Đã hủy</b> và không mở lại được.
          </>
        ),
        confirmText: "Hủy đơn",
        cancelText: "Giữ đơn",
        danger: true,
      });
      if (!ok) return;
    } else {
      const n = await dialog.prompt({
        title: `Chuyển sang "${ORDER_STATUS_LABEL[to]}"`,
        label: "Ghi chú (không bắt buộc)",
        placeholder: "VD: đã gọi, khách nhận hàng thứ 7…",
        confirmText: "Chuyển",
        maxLength: 300,
      });
      if (n === null) return;
      note = n;
    }
    setBusyId(o.id);
    setError("");
    const res = await apiCall(`/api/orders/${o.id}`, "PATCH", { status: to, note });
    setBusyId("");
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (detail?.id === o.id) setDetail(res.data);
    load();
  };

  const saveAdminNote = async () => {
    if (!detail) return;
    setBusyId(detail.id);
    const res = await apiCall(`/api/orders/${detail.id}`, "PATCH", { adminNote });
    setBusyId("");
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDetail(res.data);
    load();
  };

  // Bộ nút chuyển trạng thái hợp lệ cho một đơn.
  const StatusActions = ({ o }: { o: Order }) => (
    <div className="actions">
      {nextStatuses(o.status).map((to) => (
        <button
          key={to}
          className={`mini ${to === "CANCELLED" ? "no" : to === "CONFIRMED" || to === "DELIVERED" ? "ok" : "ed"}`}
          disabled={busyId === o.id}
          onClick={() => changeStatus(o, to)}
        >
          {ORDER_STATUS_LABEL[to]}
        </button>
      ))}
    </div>
  );

  const counts = STATUSES.map((s) => ({ s, n: rows.filter((r) => r.status === s).length }));

  return (
    <div>
      <div className="toolbar">
        <div>
          <label htmlFor="f-status">Trạng thái</label>
          <Select
            id="f-status"
            value={status}
            emptyLabel="Tất cả trạng thái"
            options={STATUSES.map((s) => ({ value: s, label: ORDER_STATUS_LABEL[s] }))}
            onChange={setStatus}
          />
        </div>
        <div>
          <label htmlFor="f-type">Loại</label>
          <Select
            id="f-type"
            value={type}
            emptyLabel="Đặt mua & hỏi giá"
            options={[
              { value: "ORDER", label: "Đặt mua" },
              { value: "QUOTE", label: "Hỏi giá" },
            ]}
            onChange={setType}
          />
        </div>
        <div style={{ minWidth: 220 }}>
          <label htmlFor="f-q">Tìm mã / tên / SĐT</label>
          <input id="f-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`${BRAND.codePrefix}261021-1234`} />
        </div>
        <span className="spacer" />
        {(status || type || q) && (
          <button
            className="ghost"
            onClick={() => {
              setStatus("");
              setType("");
              setQ("");
            }}
          >
            Bỏ lọc
          </button>
        )}
        <button className="ghost" onClick={load}>
          ↻ Làm mới
        </button>
      </div>

      {!loading && rows.length > 0 && (
        <div className="statrow">
          {counts
            .filter((c) => c.n > 0)
            .map((c) => (
              <div className="stat" key={c.s}>
                <div className="v">{c.n}</div>
                <div className="k">{ORDER_STATUS_LABEL[c.s]}</div>
              </div>
            ))}
        </div>
      )}

      {error && (
        <div className="err" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="empty">Đang tải…</div>
      ) : rows.length === 0 ? (
        <div className="empty">Không có đơn nào khớp bộ lọc.</div>
      ) : (
        <div className="card">
          <div className="scroll-x">
            <table className="stack">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Khách</th>
                  <th>Sản phẩm</th>
                  <th>Tổng</th>
                  <th>Trạng thái</th>
                  <th>Gửi lúc</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id}>
                    <td data-label="Mã" className="nowrap">
                      <div>
                        <button className="link" style={{ fontSize: 14 }} onClick={() => {
                          setDetail(o);
                          setAdminNote(o.adminNote);
                        }}>
                          {o.code}
                        </button>
                        <br />
                        <span className={`badge ${o.type === "QUOTE" ? "b-contacted" : "b-off"}`} style={{ marginTop: 4 }}>
                          {ORDER_TYPE_LABEL[o.type]}
                        </span>
                      </div>
                    </td>
                    <td data-label="Khách">
                      <div>
                        {o.customerName}
                        <br />
                        <a href={telHref(o.phone)} className="tabnum" style={{ color: "var(--ink-2)", textDecoration: "none" }}>
                          {o.phone}
                        </a>
                        {o.address && (
                          <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                            {o.address}
                          </div>
                        )}
                        {o.note && (
                          <div className="muted" style={{ fontSize: 12, marginTop: 3, fontStyle: "italic" }}>
                            “{o.note}”
                          </div>
                        )}
                      </div>
                    </td>
                    <td data-label="Sản phẩm">
                      <div>
                        {o.items.map((i) => (
                          <div key={i.id}>
                            {i.productName}
                            {i.variantName && <span className="muted"> · {i.variantName}</span>}
                            {i.quantity > 1 && <span className="muted"> × {i.quantity}</span>}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td data-label="Tổng" className="nowrap tabnum">
                      <b>{o.totalPrice == null ? "Hỏi giá" : money(o.totalPrice, o.currency || currency)}</b>
                    </td>
                    <td data-label="Trạng thái">
                      <StatusBadge status={o.status} />
                    </td>
                    <td data-label="Gửi lúc" className="nowrap tabnum">
                      <span className="muted" style={{ fontSize: 12.5 }}>
                        {fmtDateTime(o.createdAt)}
                      </span>
                    </td>
                    <td>
                      <StatusActions o={o} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detail && (
        <Modal
          title={`Đơn ${detail.code}`}
          onClose={() => setDetail(null)}
          footer={
            <>
              <button className="ghost" onClick={() => setDetail(null)}>
                Đóng
              </button>
              <button className="add" disabled={busyId === detail.id} onClick={saveAdminNote}>
                Lưu ghi chú nội bộ
              </button>
            </>
          }
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <StatusBadge status={detail.status} />
            <span className="badge b-off">{ORDER_TYPE_LABEL[detail.type]}</span>
            <span className="muted" style={{ fontSize: 13 }}>
              {fmtDateTime(detail.createdAt)}
            </span>
          </div>

          <div className="row c2">
            <div>
              <label>Khách</label>
              <div>
                {detail.customerName}
                <br />
                <a href={telHref(detail.phone)}>{detail.phone}</a>
              </div>
            </div>
            <div>
              <label>Địa chỉ</label>
              <div>{detail.address || <span className="muted">—</span>}</div>
            </div>
          </div>

          <div>
            <label>Sản phẩm</label>
            {detail.items.map((i) => (
              <div key={i.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14 }}>
                <span>
                  {i.productName}
                  {i.variantName && <span className="muted"> · {i.variantName}</span>}
                  {i.quantity > 1 && <span className="muted"> × {i.quantity}</span>}
                </span>
                <b className="tabnum">{i.unitPrice == null ? "Hỏi giá" : money(i.unitPrice * i.quantity, detail.currency)}</b>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--line)", marginTop: 8, paddingTop: 8 }}>
              <b>Tổng</b>
              <b className="tabnum" style={{ color: "var(--price)" }}>
                {detail.totalPrice == null ? "Cửa hàng báo giá" : money(detail.totalPrice, detail.currency)}
              </b>
            </div>
          </div>

          {detail.note && (
            <div>
              <label>Ghi chú của khách</label>
              <div style={{ fontStyle: "italic" }}>“{detail.note}”</div>
            </div>
          )}

          <div>
            <label htmlFor="o-adminnote">Ghi chú nội bộ (khách không thấy)</label>
            <textarea id="o-adminnote" value={adminNote} maxLength={2000} rows={3} onChange={(e) => setAdminNote(e.target.value)} />
          </div>

          <div>
            <label>Chuyển trạng thái</label>
            {nextStatuses(detail.status).length === 0 ? (
              <span className="muted" style={{ fontSize: 13.5 }}>
                Đơn đã kết thúc.
              </span>
            ) : (
              <StatusActions o={detail} />
            )}
          </div>

          <div>
            <label>Lịch sử</label>
            <div style={{ display: "grid", gap: 4, fontSize: 13 }}>
              {detail.logs.map((l) => (
                <div key={l.id}>
                  <span className="muted tabnum">{fmtDateTime(l.createdAt)}</span> ·{" "}
                  {l.fromStatus ? `${ORDER_STATUS_LABEL[l.fromStatus]} → ` : ""}
                  <b>{ORDER_STATUS_LABEL[l.toStatus]}</b>
                  {l.note && <span className="muted"> — {l.note}</span>}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
