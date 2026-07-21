export interface Param {
  key: string;
  label: string;
  type: "select" | "number" | "boolean";
  default: string | number | boolean;
  options?: string[];
  min?: number;
  max?: number;
}

export interface Model {
  id: string;
  name: string;
  kind: string;
  provider: string;
  cost: number;
  default: boolean;
  family?: string | null;
  mode?: string | null;
  icon_url?: string | null;
  description?: string | null;
  featured?: boolean;
  free?: boolean;
  params: Param[];
}
