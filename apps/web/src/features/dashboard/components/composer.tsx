import { ArrowUp, Crown, Loader2 } from "lucide-react";
import {
	CREATE_NODE_KINDS,
	NODE_CONFIG,
	type NodeKind,
} from "@/features/canvas";

// Kinds that need a paid plan. Free users see a premium badge and get routed
// to pricing instead of selecting the tab.
const PREMIUM_KINDS = new Set<NodeKind>(["video"]);

interface ComposerProps {
	value: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	kind: NodeKind;
	onKindChange: (kind: NodeKind) => void;
	isPremium: boolean;
	onUpgrade: () => void;
	busy?: boolean;
	placeholder?: string;
}

export function Composer({
	value,
	onChange,
	onSubmit,
	kind,
	onKindChange,
	isPremium,
	onUpgrade,
	busy,
	placeholder,
}: ComposerProps) {
	return (
		<div className="rounded-lg border border-border bg-card/60 p-3 shadow-sm">
			<textarea
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter" && !e.shiftKey) {
						e.preventDefault();
						onSubmit();
					}
				}}
				placeholder={placeholder}
				rows={2}
				className="min-h-16 w-full resize-none bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
			/>
			<div className="mt-2 flex items-center justify-between gap-2">
				{/* Generation-type tabs — the node kind we create + run on submit. */}
				<div className="flex items-center gap-1">
					{CREATE_NODE_KINDS.map((k: NodeKind) => {
						const Icon = NODE_CONFIG[k].icon;
						const active = k === kind;
						const locked = PREMIUM_KINDS.has(k) && !isPremium;
						return (
							<button
								key={k}
								type="button"
								onClick={() => (locked ? onUpgrade() : onKindChange(k))}
								title={
									locked ? "Video generation needs a paid plan" : undefined
								}
								className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
									active
										? "bg-[#14b8a6] text-white"
										: "text-muted-foreground hover:bg-accent hover:text-foreground"
								}`}
							>
								<Icon className="size-3.5" />
								{NODE_CONFIG[k].title}
								{locked ? <Crown className="size-3 text-amber-400" /> : null}
							</button>
						);
					})}
				</div>

				<button
					type="button"
					onClick={onSubmit}
					disabled={busy || !value.trim()}
					aria-label="Generate"
					className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#14b8a6] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
				>
					{busy ? (
						<Loader2 className="size-4 animate-spin" />
					) : (
						<ArrowUp className="size-4" />
					)}
				</button>
			</div>
		</div>
	);
}
