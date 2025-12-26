// amplify/functions/emailCampaignRunner/handler.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const handler = async () => {
  const from = mustEnv("RESEND_FROM");

  // Example send (replace with your campaign logic)
  const { data, error } = await resend.emails.send({
    from,
    to: ["test@example.com"],
    subject: "Hello from SW Tax Service",
    html: "<p>It works ✅</p>",
  });

  if (error) {
    console.error("Resend error:", error);
    throw new Error(error.message ?? "Failed to send");
  }

  console.log("Sent email id:", data?.id);
  return { ok: true, id: data?.id };
};
