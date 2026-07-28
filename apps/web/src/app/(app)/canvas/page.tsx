import { CanvasPage } from "@/features/canvas";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project } = await searchParams;
  return <CanvasPage projectId={project} />;
}
