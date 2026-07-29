"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"

import { cn } from "@/lib/cn"

function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/10">
        <SliderPrimitive.Range className="absolute h-full bg-teal-400" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-[18px] rounded-full border-2 border-teal-400 bg-white shadow outline-none transition-transform focus-visible:ring-2 focus-visible:ring-teal-400/40 active:scale-110" />
    </SliderPrimitive.Root>
  )
}

export { Slider }
