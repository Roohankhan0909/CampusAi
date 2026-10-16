import { NextResponse } from "next/server";
import { MAX_UPLOAD_BYTES, verifyLocalUpload, writeLocalUpload } from "@/lib/files";

// Local-disk stand-in for Supabase's signed upload URLs (used only when Supabase Storage isn't configured).
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const url = new URL(req.url);
  if (!(await verifyLocalUpload(id, url.searchParams.get("exp") ?? "", url.searchParams.get("sig") ?? ""))) {
    return new NextResponse("Upload link is invalid or expired.", { status: 403 });
  }
  if (Number(req.headers.get("content-length")) > MAX_UPLOAD_BYTES) return new NextResponse("File too large.", { status: 413 });
  const data = Buffer.from(await req.arrayBuffer());
  if (data.length === 0 || data.length > MAX_UPLOAD_BYTES) return new NextResponse("File too large or empty.", { status: 413 });
  try {
    await writeLocalUpload(id, data);
  } catch {
    return new NextResponse("Already uploaded.", { status: 409 });
  }
  return new NextResponse(null, { status: 200 });
}
