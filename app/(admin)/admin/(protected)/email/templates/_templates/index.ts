// app/(admin)/admin/(protected)/email/templates/_templates/index.ts
import { template as t00 } from "./waitlist/00-invite";
import { template as t01 } from "./waitlist/01-prelaunch";
import { template as t02 } from "./waitlist/02-launch.mjml";
import { template as t03 } from "./waitlist/03-launch-reminder";
import { template as t04 } from "./waitlist/04-next-steps";
import { template as t05 } from "./waitlist/05-docs-checklist";
import { template as t06 } from "./waitlist/06-why-us";
import { template as t07 } from "./waitlist/07-last-call";
import { template as t08 } from "./waitlist/08-mjml-test";

import { template as o00 } from "./onboarding/00-invite";
import { template as o01 } from "./onboarding/01-welcome-next-steps";
import { template as o02 } from "./onboarding/02-document-checklist";
import { template as o03 } from "./onboarding/03-missing-items";
import { template as o04 } from "./onboarding/04-ready-to-sign";
import { template as o05 } from "./onboarding/05-filed-confirmation";
import { template as o06 } from "./onboarding/06-accepted-confirmation";
import { template as o07 } from "./onboarding/07-rejected-return";
import { template as o08 } from "./onboarding/08-refund-advance-disclosure";
import { template as o09 } from "./onboarding/09-closing-thank-you";

export const ALL_TEMPLATES = [
  t00,
  t01,
  t02,
  t03,
  t04,
  t05,
  t06,
  t07,
  t08,
  o01,
  o02,
  o03,
  o04,
  o05,
  o06,
  o07,
  o08,
  o09,
  o00,
];
