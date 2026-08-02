import { CanvasPage } from "@/features/canvas";

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<{ project?: string; run?: string }>;
}) {
	const { project, run } = await searchParams;
	return <CanvasPage projectId={project} runOnLoad={run} />;
}
