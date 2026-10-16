import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MAX_USER_VALUE_BYTES, USER_DATA_KEY, getUserData, setUserData } from "@/lib/userData";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Please log in.", { status: 401 });
  return NextResponse.json(await getUserData(user.id), { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Please log in.", { status: 401 });
  const body = await req.text();
  if (body.length > MAX_USER_VALUE_BYTES + 200) return new NextResponse("Too large.", { status: 413 });
  let parsed: { key?: unknown; value?: unknown };
  try {
    parsed = JSON.parse(body);
  } catch {
    return new NextResponse("Invalid JSON.", { status: 400 });
  }
  if (typeof parsed.key !== "string" || !USER_DATA_KEY.test(parsed.key) || parsed.value === undefined) {
    return new NextResponse("Invalid key or value.", { status: 400 });
  }
  await setUserData(user.id, parsed.key, JSON.stringify(parsed.value));
  return new NextResponse(null, { status: 204 });
}
