import { cn } from "@/lib/utils";

export function Skeleton({ 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/80",
        className
      )}
      {...props}
    />
  );
} 