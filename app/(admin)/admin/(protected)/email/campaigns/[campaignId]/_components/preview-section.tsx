import "server-only";

import { EMAIL_PARTIALS } from "@/lib/email/templatePartials";
import { renderHandlebars, isMjml, compileMjmlToHtml } from "@/lib/email/templateEngine";
import { EMAIL_DEFAULTS } from "@/lib/constants/email-defaults";

export default async function PreviewSection({ html }: { html: string }) {
  const vars = {
    ...EMAIL_DEFAULTS,
    first_name: EMAIL_DEFAULTS.first_name ?? "there",
    unsubscribe_link:
      EMAIL_DEFAULTS.unsubscribe_link?.trim() ||
      "https://www.swtaxservice.com/unsubscribe?token=preview",
    footer_text:
      EMAIL_DEFAULTS.footer_text?.trim() ||
      "You are receiving this email because you signed up for SW Tax Service updates.",
    // keep this empty for preview; runner fills real footer_html at send-time
    footer_html: "",
  };

  let compiledHtml = "";
  let error: string | null = null;

  try {
    const source = String(html ?? "");

    // 1) render handlebars first
    const rendered = renderHandlebars(source, vars, EMAIL_PARTIALS);

    // 2) compile MJML to HTML (IMPORTANT: await)
    compiledHtml = isMjml(rendered) ? await compileMjmlToHtml(rendered) : rendered;
  } catch (e: any) {
    error = String(e?.message ?? e);
  }

  return (
    <section className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#202030]">Preview</h2>
        <span className="text-xs text-[#202030]/60">
          {error ? "Preview error" : "Compiled HTML"}
        </span>
      </div>

      {error ? (
        <pre className="mt-3 whitespace-pre-wrap rounded-2xl border bg-black/[0.03] p-3 text-xs text-red-700">
          {error}
        </pre>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border">
          <iframe title="Email preview" className="h-[720px] w-full" sandbox="" srcDoc={compiledHtml} />
        </div>
      )}
    </section>
  );
}
