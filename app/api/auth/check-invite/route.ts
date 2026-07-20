import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { code } = await req.json()

  if (!process.env.INVITE_CODE) {
    return NextResponse.json(
      { valid: false, error: "Invite system not configured" },
      { status: 500 },
    )
  }

  const valid = code === process.env.INVITE_CODE
  return NextResponse.json({ valid })
}
