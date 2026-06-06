import { Menu } from "lucide-react";
import OptimizedImage from "@/components/ui/OptimizedImage";
import { clubLogo } from "@/components/ClubLogo";

interface AdminHeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export function AdminHeader({ setSidebarOpen }: AdminHeaderProps) {
  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-40 h-16 glass-card border-b border-border relative overflow-hidden flex items-center justify-between px-4">
      {/* Glass Effect */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute -top-20 -right-20 size-40 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent rounded-full blur-2xl" />
        <div className="absolute -bottom-20 -left-20 size-32 bg-gradient-to-tr from-secondary/15 via-secondary/5 to-transparent rounded-full blur-2xl" />
      </div>
      <div className="flex items-center gap-3">
        <div className="relative size-8 rounded-lg overflow-hidden shadow ring-2 ring-primary/20">
          <OptimizedImage
            src={clubLogo}
            alt="CMS Logo"
            priority
            className="size-full object-cover bg-transparent"
          />
        </div>
        <span className="font-bold gradient-text">CMS</span>
      </div>
      <button type="button"
        onClick={() => setSidebarOpen(true)}
        className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 border border-primary/20 transition-all"
        aria-label="Open menu"
      >
        <Menu className="size-5 text-primary" />
      </button>
    </header>
  );
}
