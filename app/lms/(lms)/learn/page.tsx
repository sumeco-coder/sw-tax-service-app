// app/lms/(lms)/learn/page.tsx
import { redirect } from "next/navigation";

export default function LearnIndex() {
  redirect("/lms/learn/dashboard");
}
