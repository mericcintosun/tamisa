import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter";
import type { ApiResponse, AuditSession } from "@/lib/types";

export async function GET() {
  const adapter = getAdapter();
  const sessions = await adapter.listSessions();
  return NextResponse.json<ApiResponse<AuditSession[]>>({ ok: true, mode: adapter.mode, data: sessions }, { status: 200 });
}
