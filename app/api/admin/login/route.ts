import { NextRequest, NextResponse } from "next/server";
import { passwordOK, createSession } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

// POST /api/admin/login  body: { password }
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json().catch(() => ({ password: "" }));
    if (typeof password !== "string" || !passwordOK(password)) {
      // Làm chậm nhẹ để hạn chế dò mật khẩu bằng vòng lặp.
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json({ error: "Sai mật khẩu." }, { status: 401 });
    }
    await createSession();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
