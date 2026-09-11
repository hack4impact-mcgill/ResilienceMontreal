import { cn } from "@/lib/utils";
import Image from "next/image";

export function TopNavbar({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"nav">) {
  return (
    <nav
      className={cn(
        "w-full h-32 flex items-center justify-center bg-[#E9EFF1] shadow",
        className,
      )}
      {...props}
    >
      {/* Replace the SVG below with your desired icon */}
      <span className="inline-flex items-center justify-center">
        <Image
          src="/resilience-banner.png"
          alt="Logo"
          width={300}
          height={300}
          style={{ height: "auto" }}
        />
      </span>
    </nav>
  );
}
