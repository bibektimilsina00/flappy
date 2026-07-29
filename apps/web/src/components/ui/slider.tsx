"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"

import { cn } from "@/lib/cn"

interface SliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
  // Evenly spaced dots inside the track; the filled range covers passed ones.
  ticks?: number
}

function Slider({ className, ticks, ...props }: SliderProps) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn("relative flex w-full touch-none select-none items-center py-2", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-white/[0.08]">
        {ticks
          ? Array.from({ length: ticks }, (_, i) => (
              <span
                key={`tick-${i}`}
                className="absolute top-1/2 size-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/25"
                style={{ left: `${5 + (i / (ticks - 1)) * 90}%` }}
              />
            ))
          : null}
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-300" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className={cn(
          "block size-5 rounded-full border-[3px] border-white bg-teal-400 shadow-[0_0_0_5px_rgba(45,212,191,0.18),0_2px_8px_rgba(0,0,0,0.5)]",
          "outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-teal-400/40",
        )}
      />
    </SliderPrimitive.Root>
  )
}

export { Slider }
