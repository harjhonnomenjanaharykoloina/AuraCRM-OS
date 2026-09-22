"use client";

import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { UserNav } from "@/components/shared/user-nav";
import { LanguageSelector } from "@/components/shared/language-selector";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { useTranslations } from "@/i18n/client";

interface AdminHeaderProps {
    user: any;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
}

export function AdminHeader({ user, sidebarOpen, setSidebarOpen }: AdminHeaderProps) {
    const [isMounted, setIsMounted] = useState(false);
    const pathname = usePathname();
    const t = useTranslations();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const getPageTitle = (path: string) => {
        if (path === "/admin") return t("admin.header.dashboard");
        if (path.startsWith("/admin/objects")) return t("admin.header.objectManager");
        if (path.startsWith("/admin/users")) return t("admin.header.userManagement");
        if (path.startsWith("/admin/permissions")) return t("admin.header.permissionSets");
        if (path.startsWith("/admin/apps")) return t("admin.header.appBuilder");
        return t("admin.header.adminConsole");
    };

    if (!isMounted) {
        return (
            <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6 flex-shrink-0 z-10 sticky top-0">
                <div className="font-semibold text-lg">Admin Console</div>
            </header>
        );
    }

    return (
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6 flex-shrink-0 z-10 sticky top-0">
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    aria-label="Toggle navigation menu"
                >
                    <Menu className="h-4 w-4" />
                </Button>
                <div className="font-bold text-xl text-foreground">
                    {getPageTitle(pathname)}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <LanguageSelector />
                <div className="h-6 w-px bg-border hidden md:block"></div>
                <UserNav user={user} />
            </div>
        </header>
    );
}
