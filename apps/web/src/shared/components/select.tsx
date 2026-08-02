"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

// Custom dark dropdown — replaces the native <select> so the menu is styled,
// not the OS default popup. Used in the editor + clips publish panels.
export function Select({
	value,
	options,
	onChange,
	className,
}: {
	value: string;
	options: { value: string; label: string }[];
	onChange: (v: string) => void;
	className?: string;
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const onDown = (e: MouseEvent) => {
			if (!ref.current?.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener("mousedown", onDown);
		return () => document.removeEventListener("mousedown", onDown);
	}, [open]);

	const current = options.find((o) => o.value === value);
	return (
		<div ref={ref} className={cn("relative", className)}>
			<button
				type="button"
				aria-haspopup="listbox"
				aria-expanded={open}
				onClick={() => setOpen((v) => !v)}
				className={cn(
					"flex w-full items-center justify-between gap-2 rounded-lg border bg-[#161616] px-3 py-2 text-sm transition-colors",
					open ? "border-teal-400/50" : "border-white/10 hover:border-white/20",
				)}
			>
				<span className="truncate">{current?.label ?? value}</span>
				<ChevronDown
					className={cn(
						"size-3.5 shrink-0 text-muted-foreground transition-transform",
						open && "rotate-180",
					)}
				/>
			</button>
			{open ? (
				<div
					role="listbox"
					className="absolute left-0 right-0 top-full z-30 mt-1.5 rounded-lg border border-white/10 bg-[#1e1e1e] p-1 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-100"
				>
					{options.map((o) => {
						const active = o.value === value;
						return (
							<button
								key={o.value}
								type="button"
								role="option"
								aria-selected={active}
								onClick={() => {
									onChange(o.value);
									setOpen(false);
								}}
								className={cn(
									"flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
									active
										? "bg-teal-400/10 text-teal-300"
										: "text-foreground/90 hover:bg-white/5",
								)}
							>
								{o.label}
								{active ? <Check className="size-4" /> : null}
							</button>
						);
					})}
				</div>
			) : null}
		</div>
	);
}
