// app/(main)/files/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "aws-amplify/auth";
import FilesClient from "../_components/FilesClient";
import { configureAmplify } from "@/lib/amplifyClient";
configureAmplify();

export default function FilesPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((u) => setUserId(u.userId))
      .catch(() => setUserId(null));
  }, []);

  if (userId === null)
    return <div className="p-6">Please sign in to view your files.</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">My Files</h1>
      <p className="text-sm text-gray-600">
        Upload your documents and access files your preparer shares with you.
      </p>
      <FilesClient userId={userId} />
    </div>
  );
}
