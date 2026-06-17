"use client";

import { ArrowUpDown, ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type SortMenuItem<TValue extends string> = {
  description?: string;
  label: string;
  value: TValue;
};

type SortMenuProps<TValue extends string> = {
  align?: "center" | "end" | "start";
  "aria-label"?: string;
  className?: string;
  disabled?: boolean;
  items: Array<SortMenuItem<TValue>>;
  label?: string;
  onValueChange: (value: TValue) => void;
  value: TValue;
};

export function SortMenu<TValue extends string>({
  align = "end",
  "aria-label": ariaLabel = "选择排序方式",
  className,
  disabled = false,
  items,
  label = "排序方式",
  onValueChange,
  value,
}: SortMenuProps<TValue>) {
  const activeItem = items.find((item) => item.value === value) ?? items[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-9 max-w-full items-center gap-1.5 border-b border-transparent px-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          aria-label={ariaLabel}
          disabled={disabled}
        >
          <ArrowUpDown className="size-4 shrink-0" aria-hidden="true" />
          <span className="shrink-0">排序</span>
          <span className="min-w-0 truncate text-foreground">
            {activeItem?.label ?? "默认"}
          </span>
          <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(nextValue) => onValueChange(nextValue as TValue)}
        >
          {items.map((item) => (
            <DropdownMenuRadioItem
              key={item.value}
              value={item.value}
              className="items-start py-2"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">
                  {item.label}
                </span>
                {item.description ? (
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                    {item.description}
                  </span>
                ) : null}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
