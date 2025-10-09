import { cn } from "@/lib/utils"

export function TopNavbar({ className, ...props }: React.ComponentPropsWithoutRef<"nav">) {
    return (
        <nav className={cn("w-full h-32 flex items-center justify-center bg-[#E9EFF1] shadow", className)} {...props}>
            {/* Replace the SVG below with your desired icon */}
            <span className="inline-flex items-center justify-center">
                <img
                    src="/resilience-banner.png"
                    alt="Logo"
                    className="h-64 w-64 object-contain"
                />
            </span>
            {/* Add this example Input with white background if you have an input here */}
            {/* <input className="bg-white ...existing input classes..." /> */}
            {/* If you use a custom Input component, pass className="bg-white" */}
        </nav>
    )
}
