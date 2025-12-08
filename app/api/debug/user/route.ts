import { NextResponse } from "next/server";
import { getLmsUser } from "@/lib/lms/getUser";

export async function GET() {
  const user = await getLmsUser();
  return NextResponse.json(user);
}
