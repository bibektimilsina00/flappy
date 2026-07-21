import { Coins } from "lucide-react";

export function TokenBadge({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Coins className="size-4" />
      {value}
    </div>
  );
}
