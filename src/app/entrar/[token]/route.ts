import { NextResponse } from "next/server";

// Los enlaces anteriores ya no pueden crear sesiones.
export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/acceso?error=legacy", request.url));
}
