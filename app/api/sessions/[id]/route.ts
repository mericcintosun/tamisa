import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter";
import type { ApiError, ApiResponse, SessionBundle } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const adapter = getAdapter();
  const bundle = await adapter.getSession(id);
  if (!bundle) {
    return NextResponse.json<ApiError>({ ok: false, error: `No audit session with id "${id}".` }, { status: 404 });
  }
  return NextResponse.json<ApiResponse<SessionBundle>>({ ok: true, mode: adapter.mode, data: bundle }, { status: 200 });
}
