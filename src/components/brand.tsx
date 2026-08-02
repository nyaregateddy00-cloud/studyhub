import logo from "@/assets/studyhub-logo.png";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={logo}
      alt="StudyHub graduation cap logo"
      width={512}
      height={512}
      className={cn("size-8 object-contain", className)}
    />
  );
}

export function BrandLock({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <BrandMark />
      <span className="font-display text-lg font-bold tracking-tight">StudyHub</span>
    </span>
  );
}
