import { useState } from "react";

export function useAssistant() {
  const [open, setOpen] = useState(false);
  return {
    open,
    openAssistant: () => setOpen(true),
    closeAssistant: () => setOpen(false),
  };
}
