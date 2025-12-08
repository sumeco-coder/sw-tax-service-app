// components/lms/CreateCourseButton.tsx
"use client";

import { useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { configureAmplify } from "@/lib/amplifyClient";

configureAmplify();
const client = generateClient<Schema>();

export function CreateCourseButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setError(null);

    try {
      // TODO later: replace this with a real firmId from the logged-in user
      const firmId = "default-firm";

      const result = await client.models.Course.create({
        firmId,
        title: "New Preparer Bootcamp",
        description:
          "Step-by-step training for brand-new seasonal tax preparers to get production-ready.",
        level: "BEGINNER",     // matches enum ["BEGINNER","INTERMEDIATE","ADVANCED"]
        status: "DRAFT",       // matches enum ["DRAFT","PUBLISHED","ARCHIVED"]
        estimatedMinutes: 60,  // optional but valid
        slug: "new-preparer-bootcamp", // optional
      });

      const course = result.data;

      if (!course) {
        setError("Could not create course. Please try again.");
        return;
      }

      // Redirect into the builder
      window.location.href = `/lms/courses/${course.id}`;
    } catch (err: any) {
      console.error("CreateCourse error:", err);
      // Common case: not signed in (because Course has allow.owner())
      if (err?.name === "UserUnAuthenticatedException") {
        setError("You must be logged in to create a course.");
      } else {
        setError("Something went wrong creating the course.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="inline-flex items-center rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-sky-900/50 hover:bg-sky-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isLoading ? "Creating…" : "➕ Create course"}
      </button>
      {error && (
        <p className="text-[11px] text-red-300 text-right max-w-xs">
          {error}
        </p>
      )}
    </div>
  );
}
