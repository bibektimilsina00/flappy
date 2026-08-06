import { VideoEditorRouteClient } from "./video-editor-client";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project } = await searchParams;
  return <VideoEditorRouteClient initialProjectId={project} />;
}
