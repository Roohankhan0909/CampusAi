import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findAccessibleFile } from "@/lib/course";
import { readDb } from "@/lib/db";
import { readUpload, signedDownloadUrl, usingObjectStorage } from "@/lib/files";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Please log in.", { status: 401 });
  const file = findAccessibleFile(await readDb(), user, (await params).id);
  if (!file) return new NextResponse("File not found.", { status: 404 });
  const inline = file.type === "application/pdf" || file.type.startsWith("image/");

  if (usingObjectStorage) {
    const url = await signedDownloadUrl(file, inline);
    if (!url) return new NextResponse("File not found.", { status: 404 });
    return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, no-store" } });
  }

  let data: Buffer;
  try {
    data = await readUpload(file.id);
  } catch {
    return new NextResponse("File not found.", { status: 404 });
  }
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": file.type,
      "Content-Length": String(data.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
