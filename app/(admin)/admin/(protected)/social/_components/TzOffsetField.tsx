"use client";

import { useEffect, useState } from "react";

export default function TzOffsetField() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    // JS returns minutes behind UTC (e.g. LA = 480). We pass it through.
    setOffset(new Date().getTimezoneOffset());
  }, []);

  return <input type="hidden" name="tzOffsetMin" value={offset} />;
}
