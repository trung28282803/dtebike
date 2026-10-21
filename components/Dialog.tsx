"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/* Hệ hộp thoại thay cho alert() / confirm() / prompt() của trình duyệt.
   Vì sao không dùng native: trình duyệt hiển thị kèm tên domain, không theo được
   nhận diện thương hiệu, không dịch được nhãn nút, và trên iOS có thể bị chặn.

   Dùng:
     const dialog = useDialog();
     if (!(await dialog.confirm({ title: "Xóa?", danger: true }))) return;
     const name = await dialog.prompt({ title: "Tên mới", defaultValue: cur });
     await dialog.alert({ title: "Xong", message: "Đã lưu." });
*/

interface ConfirmOpts {
  title: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}
interface AlertOpts {
  title: string;
  message?: React.ReactNode;
  confirmText?: string;
}
interface PromptOpts {
  title: string;
  message?: React.ReactNode;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  maxLength?: number;
}

interface DialogApi {
  confirm: (o: ConfirmOpts) => Promise<boolean>;
  alert: (o: AlertOpts) => Promise<void>;
  prompt: (o: PromptOpts) => Promise<string | null>;
}

const DialogContext = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog phải nằm trong <DialogProvider>.");
  return ctx;
}

type State =
  | { kind: "confirm"; opts: ConfirmOpts; resolve: (v: boolean) => void }
  | { kind: "alert"; opts: AlertOpts; resolve: (v: void) => void }
  | { kind: "prompt"; opts: PromptOpts; resolve: (v: string | null) => void }
  | null;

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(null);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const confirm = useCallback(
    (opts: ConfirmOpts) => new Promise<boolean>((resolve) => setState({ kind: "confirm", opts, resolve })),
    []
  );
  const alert = useCallback(
    (opts: AlertOpts) => new Promise<void>((resolve) => setState({ kind: "alert", opts, resolve })),
    []
  );
  const prompt = useCallback(
    (opts: PromptOpts) =>
      new Promise<string | null>((resolve) => {
        setText(opts.defaultValue ?? "");
        setState({ kind: "prompt", opts, resolve });
      }),
    []
  );

  const close = (value: boolean | string | null) => {
    if (!state) return;
    if (state.kind === "confirm") state.resolve(value === true);
    else if (state.kind === "alert") state.resolve();
    else state.resolve(typeof value === "string" ? value : null);
    setState(null);
  };

  // Esc để hủy, và focus vào ô nhập khi mở prompt.
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(state.kind === "confirm" ? false : null);
    };
    document.addEventListener("keydown", onKey);
    if (state.kind === "prompt") requestAnimationFrame(() => inputRef.current?.select());
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const o = state?.opts;
  const isPrompt = state?.kind === "prompt";
  const promptOpts = isPrompt ? (state.opts as PromptOpts) : null;
  const canSubmit = !isPrompt || text.trim().length > 0;

  return (
    <DialogContext.Provider value={{ confirm, alert, prompt }}>
      {children}

      {state && o && (
        <div
          className="ovl"
          onClick={() => close(state.kind === "confirm" ? false : null)}
          role="dialog"
          aria-modal="true"
          aria-label={o.title}
        >
          <div className="modal dialog" onClick={(e) => e.stopPropagation()}>
            <div className="hd">
              <h3>{o.title}</h3>
            </div>

            {(o.message || isPrompt) && (
              <div className="bd">
                {o.message && <div style={{ fontSize: 14, lineHeight: 1.65 }}>{o.message}</div>}
                {promptOpts && (
                  <div>
                    {promptOpts.label && <label htmlFor="dlg-input">{promptOpts.label}</label>}
                    <input
                      id="dlg-input"
                      ref={inputRef}
                      value={text}
                      maxLength={promptOpts.maxLength ?? 200}
                      placeholder={promptOpts.placeholder}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && canSubmit) close(text.trim());
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="ft">
              {state.kind !== "alert" && (
                <button className="ghost" onClick={() => close(state.kind === "confirm" ? false : null)}>
                  {(o as ConfirmOpts | PromptOpts).cancelText ?? "Hủy"}
                </button>
              )}
              <button
                className={state.kind === "confirm" && (o as ConfirmOpts).danger ? "cta danger" : "cta"}
                disabled={!canSubmit}
                autoFocus={!isPrompt}
                onClick={() => close(isPrompt ? text.trim() : true)}
              >
                {o.confirmText ?? (state.kind === "alert" ? "Đã hiểu" : "Đồng ý")}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}
