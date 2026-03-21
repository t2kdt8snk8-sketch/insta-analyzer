"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, History } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "대시보드", href: "/", icon: LayoutDashboard },
  { name: "분석 기록", href: "/history", icon: History },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-screen w-full bg-background font-sans overflow-x-hidden">
      
      {/* Top Header Navigation */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50 shrink-0 shadow-sm">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-teal-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
              <span className="text-white font-bold text-lg">IA</span>
            </div>
            <span className="font-bold tracking-tight text-lg hidden sm:block">Insta-Analyzer</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1 ml-4 border-l border-border/50 pl-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all group",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}>
                    <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Mobile Navigation (Right side icons) */}
        <nav className="sm:hidden flex items-center gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-md transition-all",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                  <item.icon className="w-5 h-5" />
                </div>
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative w-full min-w-0">
        <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-indigo-50/80 to-transparent pointer-events-none z-0" />
        <div className="px-6 md:px-10 py-8 max-w-[1600px] mx-auto w-full relative z-10">
          {children}
        </div>
      </main>

    </div>
  );
}
