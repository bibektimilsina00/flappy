import { ArrowUp, Loader2 } from "lucide-react";
import {
	CREATE_NODE_KINDS,
	NODE_CONFIG,
	type NodeKind,
} from "@/features/canvas/constants";

interface ComposerProps {
	value: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	kind: NodeKind;
	onKindChange: (kind: NodeKind) => void;
	busy?: boolean;
	placeholder?: string;
}

export function Composer({
	value,
	onChange,
	onSubmit,
	kind,
	onKindChange,
	busy,
	placeholder,
}: ComposerProps) {
	return (
		<div className="rounded-2xl border border-border bg-card/60 p-3 shadow-sm">
			{/* Generation-type tabs — the node kind we create + run on submit. */}
			<div className="mb-2 flex items-center gap-1">
				{CREATE_NODE_KINDS.map((k) => {
					const Icon = NODE_CONFIG[k].icon;
					const active = k === kind;
					return (
						<button
							key={k}
							type="button"
							onClick={() => onKindChange(k)}
							className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
								active
									? "bg-foreground text-background"
									: "text-muted-foreground hover:bg-accent hover:text-foreground"
							}`}
						>
							<Icon className="size-3.5" />
							{NODE_CONFIG[k].title}
						</button>
					);
				})}
			</div>

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
			<div className="mt-2 flex items-center justify-end">
				<button
					type="button"
					onClick={onSubmit}
					disabled={busy || !value.trim()}
					aria-label="Generate"
					className="flex size-8 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-40"
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
