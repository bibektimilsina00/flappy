import { useState } from "react";

export function useComposer(onSubmit?: (value: string) => void) {
  const [value, setValue] = useState("");

  const submit = () => {
    const text = value.trim();
    if (!text) return;
    onSubmit?.(text);
    setValue("");
  };

  return { value, setValue, submit };
}
