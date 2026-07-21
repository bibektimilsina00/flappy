import { EditorPage } from "@/features/editor";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project } = await searchParams;
  return <EditorPage projectId={project} />;
}
