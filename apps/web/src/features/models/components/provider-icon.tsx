import {
  Ai21,
  Alibaba,
  AionLabs,
  Anthropic,
  Baichuan,
  Baidu,
  ByteDance,
  Cohere,
  DeepSeek,
  Doubao,
  ElevenLabs,
  Flux,
  Gemini,
  Grok,
  Hailuo,
  Hunyuan,
  IBM,
  Ideogram,
  Inflection,
  Kimi,
  Kling,
  Kwaipilot,
  Luma,
  Meshy,
  Meta,
  Microsoft,
  Minimax,
  Mistral,
  Moonshot,
  NousResearch,
  Nvidia,
  OpenAI,
  Perplexity,
  Pika,
  PixVerse,
  Qwen,
  Recraft,
  Replicate,
  Runway,
  Stability,
  Stepfun,
  Suno,
  Tripo,
  Udio,
  Vidu,
  XiaomiMiMo,
  Yi,
  Zhipu,
} from "@lobehub/icons";
import type { ComponentType } from "react";
import { cn } from "@/lib/cn";

// Brand marks come from @lobehub/icons (https://lobehub.com/icons). Each brand
// exposes an `.Avatar` — a brand-coloured rounded badge — which we map from the
// model's `provider` slug (the maker, never the inference host).
type Branded = ComponentType<{ size?: number }> & {
  Avatar: ComponentType<{ size?: number; shape?: "circle" | "square" }>;
};

const REGISTRY: Record<string, Branded> = {
  openai: OpenAI as Branded,
  google: Gemini as Branded,
  deepseek: DeepSeek as Branded,
  meta: Meta as Branded,
  moonshot: Moonshot as Branded,
  zhipu: Zhipu as Branded,
  qwen: Qwen as Branded,
  minimax: Minimax as Branded,
  nvidia: Nvidia as Branded,
  baidu: Baidu as Branded,
  stepfun: Stepfun as Branded,
  xiaomi: XiaomiMiMo as Branded,
  tencent: Hunyuan as Branded,
  mistral: Mistral as Branded,
  kwai: Kwaipilot as Branded,
  kuaishou: Kling as Branded,
  alibaba: Alibaba as Branded,
  bytedance: ByteDance as Branded,
  pixverse: PixVerse as Branded,
  vidu: Vidu as Branded,
  blackforest: Flux as Branded,
  yi: Yi as Branded,
  baichuan: Baichuan as Branded,
  microsoft: Microsoft as Branded,
  nousresearch: NousResearch as Branded,
  moonshotai: Kimi as Branded,
  anthropic: Anthropic as Branded,
  grok: Grok as Branded,
  cohere: Cohere as Branded,
  ai21: Ai21 as Branded,
  ibm: IBM as Branded,
  "ibm-granite": IBM as Branded,
  inflection: Inflection as Branded,
  perplexity: Perplexity as Branded,
  kwaipilot: Kwaipilot as Branded,
  "aion-labs": AionLabs as Branded,
  // Media makers (Replicate-hosted)
  flux: Flux as Branded,
  kling: Kling as Branded,
  hailuo: Hailuo as Branded,
  doubao: Doubao as Branded,
  luma: Luma as Branded,
  ideogram: Ideogram as Branded,
  recraft: Recraft as Branded,
  runway: Runway as Branded,
  pika: Pika as Branded,
  stability: Stability as Branded,
  suno: Suno as Branded,
  udio: Udio as Branded,
  elevenlabs: ElevenLabs as Branded,
  tripo: Tripo as Branded,
  meshy: Meshy as Branded,
  replicate: Replicate as Branded,
};

const PX = { sm: 20, md: 32, lg: 36 } as const;

export function ProviderIcon({
  provider,
  size = "md",
}: {
  provider?: string;
  size?: keyof typeof PX;
}) {
  const Icon = provider ? REGISTRY[provider] : undefined;
  const px = PX[size];

  if (Icon) {
    return <Icon.Avatar size={px} shape="square" />;
  }

  // Unmapped maker → lettered badge.
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-md bg-muted font-bold text-foreground")}
      style={{ width: px, height: px, fontSize: px * 0.4 }}
    >
      {(provider ?? "?").charAt(0).toUpperCase()}
    </span>
  );
}
