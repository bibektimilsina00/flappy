"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useBalance } from "@/features/billing";
import type { NodeKind } from "@/features/canvas/constants";
import { createWorkflow, RecentProjects } from "@/features/projects";
import { useSession } from "@/stores/session";
import { Composer } from "../components/composer";
import { Greeting } from "../components/greeting";
import { TokenBadge } from "../components/token-badge";
import { useComposer } from "../hooks/use-composer";

const PLACEHOLDER: Record<NodeKind, string> = {
	text: "Describe the text or script to write…",
	image: "Describe an image to generate…",
	video: "Describe a video to generate…",
	audio: "Describe the audio to generate…",
	world: "Describe a scene to generate…",
};

export function DashboardPage() {
	const userName = useSession((s) => s.user?.name)?.split(" ")[0] ?? "there";
	const { data: balance } = useBalance();
	const router = useRouter();
	const [kind, setKind] = useState<NodeKind>("video");
	const [busy, setBusy] = useState(false);

	// Create a project seeded with one node of the chosen kind carrying the
	// prompt, then open the canvas and auto-run that node.
	const start = async (text: string) => {
		if (busy) return;
		setBusy(true);
		try {
			const nodeId = `node-${crypto.randomUUID()}`;
			const graph = {
				nodes: [
					{
						id: nodeId,
						type: kind,
						position: { x: 240, y: 160 },
						data: { kind, prompt: text },
					},
				],
				edges: [],
			};
			const wf = await createWorkflow(
				text.slice(0, 48) || "Untitled project",
				graph,
			);
			router.push(`/canvas?project=${wf.id}&run=${nodeId}`);
		} catch (e) {
			setBusy(false);
			alert(e instanceof Error ? e.message : "Couldn't start generation");
		}
	};

	const composer = useComposer(start);

	return (
		<div className="relative h-full overflow-y-auto">
			<div className="absolute right-6 top-4 z-10">
				<TokenBadge value={Math.round(balance?.balance ?? 0)} />
			</div>

			{/* One column, uniform gap between every block. Anchored from the top
          (pt), so blocks below never shift the greeting/composer up. */}
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 pb-20 pt-[24vh]">
				<div className="w-full space-y-6">
					<Greeting name={userName} />
					<Composer
						value={composer.value}
						onChange={composer.setValue}
						onSubmit={composer.submit}
						kind={kind}
						onKindChange={setKind}
						busy={busy}
						placeholder={PLACEHOLDER[kind]}
					/>
				</div>
				<RecentProjects />
				{/* Community works hidden until there's real community content. */}
			</div>
		</div>
	);
}
