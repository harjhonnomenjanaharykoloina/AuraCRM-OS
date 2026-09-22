"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";
import { LayoutDashboard, X } from "lucide-react";
import { Drawer, DrawerClose, DrawerContent } from "@/components/ui/drawer";
import { useTranslations } from "@/i18n/client";

interface StandardSidebarProps {
    currentAppApiName: string;
    navItems: Array<{
        id: number;
        objectDef: {
            apiName: string;
            pluralLabel: string;
            icon?: string | null;
        };
    }>;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
}

export function StandardSidebar({
    currentAppApiName,
    navItems,
    sidebarOpen,
    setSidebarOpen,
}: StandardSidebarProps) {
    const pathname = usePathname();
    const t = useTranslations();
    const dashboardHref = `/app/${currentAppApiName}/dashboard`;
    const objectRouteBase = `/app/${currentAppApiName}`;

    const renderNav = () => (
        <>
            <div className="border-b border-border/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("shared.nav.navigation")}
                </p>
            </div>
            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3">
                <Link
                    href={dashboardHref}
                    className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        pathname === dashboardHref
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>{t("standard.nav.dashboard")}</span>
                </Link>
                {navItems.map((item) => {
                    const href = `${objectRouteBase}/${item.objectDef.apiName}`;
                    const isActive = pathname.startsWith(href);
                    const Icon = (Icons as any)[item.objectDef.icon || "Box"] || Icons.Box;
                    return (
                        <Link
                            key={item.id}
                            href={href}
                            className={cn(
                                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            <span className="truncate">{item.objectDef.pluralLabel}</span>
                        </Link>
                    );
                })}
            </nav>
        </>
    );

    return (
        <>
            {/* Desktop fixed sidebar */}
            <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 self-start border-r border-border/80 bg-white lg:flex">
                <div className="flex min-h-0 flex-1 flex-col">
                    {renderNav()}
                </div>
            </aside>

            {/* Mobile drawer */}
            <div className="lg:hidden">
                <Drawer open={sidebarOpen} onOpenChange={setSidebarOpen} direction="left">
                    <DrawerContent className="!w-64 p-0 flex flex-col bg-white border-r border-border/80">
                        <DrawerClose asChild>
                            <button
                                type="button"
                                className="absolute top-3 right-3 z-10 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </DrawerClose>
                        <div className="flex min-h-0 flex-1 flex-col">
                            {renderNav()}
                        </div>
                    </DrawerContent>
                </Drawer>
            </div>
        </>
    );
}
