"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import {
	listSchedule,
	listSocialAccounts,
	type PublishResult,
	tiktokCreatorInfo,
} from "@/features/clips";
import { publishPostSchema } from "../../schemas/editor-schemas";
import {
	publishEditorProject,
	renderEditorProject,
	shareEditorProject,
} from "../../services/video-editor-api";
import { buildCaptions } from "../../lib/captions";
import type { VideoEditorDoc } from "../../types";

const TERMINAL = new Set(["posted", "failed"]);

export function useExportPanel({
	projectId,
	title: initialTitle,
	doc,
	share: initialShare,
	saveFirst,
}: {
	projectId: string;
	title: string;
	doc: VideoEditorDoc;
	share: { review: string | null; presentation: string | null };
	saveFirst: () => Promise<void>;
}) {
	const qc = useQueryClient();
	const [view, setView] = useState<"menu" | "publish" | "share">("menu");

	// render state
	const [rendering, setRendering] = useState(false);
	const [renderRes, setRenderRes] = useState<{
		key: string;
		url: string;
		kind: string;
		duration: number;
	} | null>(null);

	// publish form state
	const [selectedAccs, setSelectedAccs] = useState<Set<string>>(new Set());
	const [postTitle, setPostTitle] = useState(initialTitle);
	const [postCaption, setPostCaption] = useState("");
	const [tiktokPrivacy, setTiktokPrivacy] = useState("PUBLIC_TO_EVERYONE");
	const [publishing, setPublishing] = useState(false);
	const [publishResults, setPublishResults] = useState<PublishResult[] | null>(
		null,
	);
	const [publishError, setPublishError] = useState<string | null>(null);

	// share links state
	const [shareTokens, setShareTokens] = useState<{
		review: string | null;
		presentation: string | null;
	}>({
		review: initialShare.review ?? null,
		presentation: initialShare.presentation ?? null,
	});
	const [sharingMode, setSharingMode] = useState<
		"review" | "presentation" | null
	>(null);

	// social accounts + tiktok privacy options
	const { data: socialAccs = [] } = useQuery({
		queryKey: ["social-accounts"],
		queryFn: listSocialAccounts,
	});

	const tiktokAcc = socialAccs.find((a) => a.platform === "tiktok");
	useQuery({
		queryKey: ["tiktok-creator-info", tiktokAcc?.id],
		queryFn: () => tiktokCreatorInfo(tiktokAcc!.id),
		enabled: !!tiktokAcc && selectedAccs.has(tiktokAcc.id),
	});

	// Poll publish results until terminal
	const hasPending =
		publishResults?.some((r) => !TERMINAL.has(r.status)) ?? false;
	useQuery({
		queryKey: ["editor-publish-status", projectId],
		queryFn: async () => {
			const res = await listSchedule();
			setPublishResults((prev) => {
				if (!prev) return prev;
				const map = new Map(res.map((item) => [item.id, item]));
				return prev.map((item) => map.get(item.id) ?? item);
			});
			return res;
		},
		enabled: hasPending,
		refetchInterval: 2000,
	});

	// Fire an ffmpeg render job (or reuse the active one)
	const triggerRender = useCallback(async () => {
		if (renderRes || rendering) return renderRes;
		setRendering(true);
		try {
			await saveFirst();
			const res = await renderEditorProject(projectId, { format: "mp4" });
			setRenderRes(res);
			return res;
		} finally {
			setRendering(false);
		}
	}, [projectId, renderRes, rendering, saveFirst]);

	// Auto-start render when switching into Publish view
	useEffect(() => {
		if (view === "publish" && !renderRes && !rendering) {
			void triggerRender();
		}
	}, [view, renderRes, rendering, triggerRender]);

	// Toggle account selection
	const toggleAcc = (id: string) => {
		setSelectedAccs((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	// Execute post creation with Zod schema validation
	const handlePublish = async () => {
		setPublishError(null);
		let key = renderRes?.key;
		if (!key) {
			const r = await triggerRender();
			key = r?.key;
		}
		if (!key) {
			setPublishError("Render failed — cannot publish.");
			return;
		}

		try {
			const validatedPayload = publishPostSchema.parse({
				title: postTitle,
				caption: postCaption,
				account_ids: Array.from(selectedAccs),
				tiktok_privacy: tiktokPrivacy,
			});

			setPublishing(true);
			const res = await publishEditorProject(projectId, {
				render_key: key,
				account_ids: validatedPayload.account_ids,
				title: validatedPayload.title,
				caption: validatedPayload.caption,
				tiktok_privacy: validatedPayload.tiktok_privacy,
			});
			setPublishResults(res);
			qc.invalidateQueries({ queryKey: ["schedule"] });
		} catch (e) {
			setPublishError(
				e instanceof Error ? e.message : "Failed to trigger publish",
			);
		} finally {
			setPublishing(false);
		}
	};

	// Toggle share link (create or revoke)
	const toggleShare = async (mode: "review" | "presentation") => {
		const active = !!shareTokens[mode];
		setSharingMode(mode);
		try {
			await saveFirst();
			const res = await shareEditorProject(projectId, mode, active);
			setShareTokens((prev) => ({ ...prev, [mode]: res.token }));
			qc.invalidateQueries({ queryKey: ["editor-project", projectId] });
		} finally {
			setSharingMode(null);
		}
	};

	// Download raw subtitle file (SRT / VTT)
	const downloadSubtitle = (format: "srt" | "vtt") => {
		const text = buildCaptions(doc, format);
		if (!text) return;
		const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${initialTitle.replace(/\s+/g, "_")}.${format}`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return {
		view,
		setView,
		rendering,
		renderRes,
		triggerRender,
		socialAccs,
		tiktokAcc,
		selectedAccs,
		toggleAcc,
		postTitle,
		setPostTitle,
		postCaption,
		setPostCaption,
		tiktokPrivacy,
		setTiktokPrivacy,
		publishing,
		publishResults,
		publishError,
		handlePublish,
		shareTokens,
		sharingMode,
		toggleShare,
		downloadSubtitle,
	};
}
