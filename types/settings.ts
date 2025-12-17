export type WaitlistMode = "instant" | "bulk";

export type AppSettingKey =
  | "waitlistOpen"
  | "waitlistMode"
  | "waitlistOpenAtUtc"
  | "waitlistCloseAtUtc"
  | (string & {}); // allows custom keys too
