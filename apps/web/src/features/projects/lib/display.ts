export function formatUpdated(iso: string): string {
  const date = new Date(iso);
  return `Updated ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

const GRADIENTS = [
  "linear-gradient(160deg,#3ee0c4 0%,#2a7fb8 55%,#1b3a5c 100%)",
  "linear-gradient(160deg,#ffc11e 0%,#f59e0b 55%,#6b5a10 100%)",
  "linear-gradient(160deg,#a855f7 0%,#4f46e5 55%,#1e1b4b 100%)",
  "linear-gradient(160deg,#f472b6 0%,#db2777 55%,#500724 100%)",
  "linear-gradient(160deg,#34d399 0%,#059669 55%,#064e3b 100%)",
];

// Deterministic gradient per workflow id so a card always looks the same.
export function gradientFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}
