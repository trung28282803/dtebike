"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

/* Dropdown tự vẽ, thay <select> của trình duyệt.
   Lý do: danh sách <option> native không style được (mỗi OS một kiểu, không đặt
   được font/màu/khoảng cách, chuỗi dài bị cắt cụt trên mobile).

   Có sẵn: nhóm option, dòng phụ (hint), tìm kiếm khi danh sách dài, điều hướng
   bàn phím (↑ ↓ Home End Enter Esc), và role/aria đúng chuẩn listbox. */

export interface SelectOption {
  value: string;
  label: string;
  /** Dòng phụ hiển thị mờ bên dưới nhãn (thời lượng, giá, vai trò…). */
  hint?: string;
  /** Tên nhóm — các option cùng nhóm liền nhau sẽ có một tiêu đề nhóm. */
  group?: string;
  disabled?: boolean;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  /** Nhãn cho lựa chọn rỗng. Bỏ trống thì không cho chọn rỗng. */
  emptyLabel?: string;
  disabled?: boolean;
  id?: string;
  /** Bắt buộc hiện ô tìm kiếm. Mặc định: tự hiện khi có trên 8 option. */
  searchable?: boolean;
  emptyText?: string;
}

const SEARCH_THRESHOLD = 8;

export default function Select({
  value,
  onChange,
  options,
  placeholder = "Chọn…",
  emptyLabel,
  disabled,
  id,
  searchable,
  emptyText = "Không có lựa chọn nào.",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);

  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const showSearch = searchable ?? options.length > SEARCH_THRESHOLD;

  // Danh sách hiển thị = (lựa chọn rỗng) + option khớp từ khóa.
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? options.filter(
          (o) =>
            o.label.toLowerCase().includes(q) ||
            (o.hint ?? "").toLowerCase().includes(q) ||
            (o.group ?? "").toLowerCase().includes(q)
        )
      : options;
    return emptyLabel !== undefined && !q
      ? [{ value: "", label: emptyLabel } as SelectOption, ...matched]
      : matched;
  }, [options, query, emptyLabel]);

  const selected = options.find((o) => o.value === value);
  const shownLabel = value === "" ? (emptyLabel ?? "") : (selected?.label ?? "");

  const close = () => {
    setOpen(false);
    setQuery("");
    setActive(-1);
  };

  // Mở: đặt con trỏ vào ô tìm kiếm, đánh dấu dòng đang chọn là dòng active.
  useEffect(() => {
    if (!open) return;
    const i = items.findIndex((o) => o.value === value);
    setActive(i >= 0 ? i : 0);
    if (showSearch) requestAnimationFrame(() => searchRef.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Đóng khi bấm ra ngoài.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  // Cuộn dòng đang active vào tầm nhìn.
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({
      block: "nearest",
    });
  }, [active, open]);

  const pick = (o?: SelectOption) => {
    if (!o || o.disabled) return;
    onChange(o.value);
    close();
  };

  const move = (delta: number) => {
    if (!items.length) return;
    let i = active;
    for (let step = 0; step < items.length; step++) {
      i = (i + delta + items.length) % items.length;
      if (!items[i].disabled) break;
    }
    setActive(i);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "ArrowDown":
        e.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        move(-1);
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(items.length - 1);
        break;
      case "Enter":
        e.preventDefault();
        pick(items[active]);
        break;
      case "Tab":
        close();
        break;
    }
  };

  return (
    <div className="selectfield" ref={boxRef} onKeyDown={onKeyDown}>
      <button
        type="button"
        id={id}
        /* "noval" chứ không phải "empty": .empty là class utility toàn cục cho khối
           trạng thái rỗng (padding 40px + viền dashed), trùng tên sẽ làm nút phình to. */
        className={`selectbtn${open ? " open" : ""}${!shownLabel ? " noval" : ""}`}
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <span className="lbl">
          {shownLabel || placeholder}
          {selected?.hint && <span className="hint"> · {selected.hint}</span>}
        </span>
        <span className="caret" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="selectpop">
          {showSearch && (
            <div className="selectsearch">
              <input
                ref={searchRef}
                value={query}
                placeholder="Tìm…"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
              />
            </div>
          )}

          <div className="selectlist" ref={listRef} id={listId} role="listbox">
            {items.length === 0 ? (
              <div className="selectnone">{emptyText}</div>
            ) : (
              items.map((o, i) => {
                // Tiêu đề nhóm chỉ in ở option đầu tiên của nhóm đó.
                const header = o.group && o.group !== items[i - 1]?.group ? o.group : null;
                return (
                  <div key={`${o.value}-${i}`}>
                    {header && <div className="selectgrp">{header}</div>}
                    <div
                      data-i={i}
                      role="option"
                      aria-selected={o.value === value}
                      aria-disabled={o.disabled}
                      className={`selectopt${o.value === value ? " sel" : ""}${
                        i === active ? " act" : ""
                      }${o.disabled ? " dis" : ""}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(o)}
                    >
                      <span className="txt">
                        <span className="l">{o.label}</span>
                        {o.hint && <span className="h">{o.hint}</span>}
                      </span>
                      {o.value === value && (
                        <span className="tick" aria-hidden="true">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2.5 7.5 5.5 10.5 11.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
