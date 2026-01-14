const BOT_REGEX =
  /bot|crawler|spider|crawling|headless|lighthouse|pagespeed|google|bing|yahoo|duckduck|baidu|yandex|facebook|twitter|slack|discord|whatsapp/i;

export function isBot(userAgent?: string | null) {
  if (!userAgent) return true;
  return BOT_REGEX.test(userAgent);
}
