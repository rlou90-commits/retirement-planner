import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let body: { feedback?: string; name?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { feedback, name, email } = body;

  if (!feedback || !feedback.trim()) {
    return NextResponse.json({ error: "Feedback is required" }, { status: 400 });
  }

  const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("FEEDBACK_WEBHOOK_URL is not configured");
    return NextResponse.json(
      { success: false, error: "Webhook URL not configured" },
      { status: 500 },
    );
  }

  const payload = {
    feedback: feedback.trim(),
    ...(name?.trim() ? { name: name.trim() } : {}),
    ...(email?.trim() ? { email: email.trim() } : {}),
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Webhook responded with ${res.status}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
