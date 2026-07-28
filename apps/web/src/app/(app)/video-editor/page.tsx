import { VideoEditorPage } from "@/features/video-editor";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project } = await searchParams;
  if (!project) {
    return (
      <div className="grid h-full w-full place-items-center text-muted-foreground">
        No project selected.
      </div>
    );
  }
  return <VideoEditorPage projectId={project} />;
}
