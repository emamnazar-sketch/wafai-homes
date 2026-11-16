// Wafai Homes lead delivery — Cloudflare Pages Function.
// Receives form submissions from the site ({subject, fields}) and emails them
// to wafaihomes@gmail.com via the Resend API.
// Requires the Pages secret RESEND_API_KEY. If the secret is missing or
// Resend errors, returns 500 {ok:false} so the page falls back to FormSubmit.

function methodNotAllowed() {
  return Response.json({ ok: false, error: "method_not_allowed" }, { status: 405 });
}

export async function onRequestGet() {
  return methodNotAllowed();
}

export async function onRequestOptions() {
  return methodNotAllowed();
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.RESEND_API_KEY) {
    return Response.json({ ok: false, error: "email_not_configured" }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return Response.json({ ok: false, error: "bad_json" }, { status: 500 });
  }

  const subject = typeof body.subject === "string" && body.subject.trim()
    ? body.subject.trim()
    : "New lead from WafaiHomes.com";
  const fields = body.fields && typeof body.fields === "object" ? body.fields : {};

  const lines = [];
  let replyTo;
  for (const [label, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === "") continue;
    lines.push(`${label}: ${value}`);
    if (!replyTo && /e-?mail/i.test(label) && typeof value === "string" && value.includes("@")) {
      replyTo = value;
    }
  }
  if (!lines.length) lines.push("(no fields submitted)");

  const payload = {
    from: "Wafai Homes Website <hello@thefamilyground.com>",
    to: ["wafaihomes@gmail.com"],
    subject,
    text: lines.join("\n"),
  };
  if (replyTo) payload.reply_to = replyTo;

  let res;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return Response.json({ ok: false, error: "resend_unreachable" }, { status: 500 });
  }

  if (!res.ok) {
    return Response.json({ ok: false, error: "resend_error", status: res.status }, { status: 500 });
  }

  return Response.json({ ok: true });
}
