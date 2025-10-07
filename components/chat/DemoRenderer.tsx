"use client";

import React from "react";
import DemoRendererCards from "./DemoRendererCards";
import DemoRendererInteractive from "./DemoRendererInteractive";

export default function DemoRenderer({ m, context }: { m: any; context: any }) {
  if (!m || !(m as any)?.metadata?.demo) return null;
  // Try interactive first (so countdown/question handlers run), then cards fallback
  return (
    <>
      <DemoRendererInteractive m={m} context={context} />
      <DemoRendererCards m={m} context={context} />
    </>
  );
}
