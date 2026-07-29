"use client";

import { use } from "react";
import { ClipsJobPage } from "@/features/clips";

export default function Page({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  return <ClipsJobPage jobId={jobId} />;
}
