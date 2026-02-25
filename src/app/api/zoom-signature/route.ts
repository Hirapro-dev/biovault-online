import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { meetingNumber, role = 0 } = await request.json();

    if (!meetingNumber) {
      return NextResponse.json(
        { error: "ミーティング番号が必要です" },
        { status: 400 }
      );
    }

    const sdkKey = process.env.ZOOM_SDK_KEY;
    const sdkSecret = process.env.ZOOM_SDK_SECRET;

    if (!sdkKey || !sdkSecret) {
      return NextResponse.json(
        { error: "Zoom SDKの設定がされていません" },
        { status: 500 }
      );
    }

    // Zoom Meeting SDK v5+ JWT signature generation
    // v5ではペイロードに appKey を使用
    const iat = Math.round(Date.now() / 1000) - 30;
    const exp = iat + 60 * 60 * 2; // 2 hours

    const header = { alg: "HS256", typ: "JWT" };
    const payload = {
      appKey: sdkKey,
      mn: meetingNumber,
      role,
      iat,
      exp,
      tokenExp: exp,
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
      "base64url"
    );
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      "base64url"
    );

    const signature = crypto
      .createHmac("sha256", sdkSecret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest("base64url");

    const jwt = `${encodedHeader}.${encodedPayload}.${signature}`;

    return NextResponse.json({ signature: jwt, sdkKey });
  } catch (err) {
    console.error("Zoom signature error:", err);
    return NextResponse.json(
      { error: "署名の生成に失敗しました" },
      { status: 500 }
    );
  }
}
