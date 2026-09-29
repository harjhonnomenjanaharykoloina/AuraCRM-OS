"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserNav } from "@/components/shared/user-nav";
import { LanguageSelector } from "@/components/shared/language-selector";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { GlobalSearch } from "@/components/standard/layout/global-search";
import { NotificationsMenu } from "@/components/standard/layout/notifications-menu";
import { Button } from "@/components/ui/button";
import * as Icons from "lucide-react";
import { useTranslations } from "@/i18n/client";

interface AppHeaderProps {
    apps: any[];
    currentAppApiName?: string;
    user: any;
    isAdmin: boolean;
    profileHref?: string;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
}

export function AppHeader({
    apps,
    currentAppApiName,
    user,
    isAdmin,
    profileHref,
    sidebarOpen,
    setSidebarOpen,
}: AppHeaderProps) {
    const t = useTranslations();
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleAppChange = (value: string) => {
        router.push(`/app/${value}/dashboard`);
    };

    if (!isMounted) {
        return (
            <header className="sticky top-0 z-20 border-b border-border bg-white">
                <div className="flex h-16 items-center justify-between px-6">
                    <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-foreground">
                        <Image src="/logo.png" alt={t("public.appName")} className="h-6 w-6" width={24} height={24} />
                        <span>{t("public.appName")}</span>
                    </div>
                </div>
            </header>
        );
    }

    const defaultAppApiName = currentAppApiName ?? (apps[0]?.apiName ?? null);
    const activeAppApiName = currentAppApiName ?? defaultAppApiName;

    return (
        <header className="sticky top-0 z-20 border-b border-border bg-white">
            <div className="flex h-16 items-center justify-between overflow-visible px-4 md:px-6">
                {/* Left Section: Hamburger, Logo & App Switcher */}
                <div className="flex min-w-0 flex-1 items-center gap-4 lg:gap-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        aria-label={t("shared.nav.navigation")}
                        aria-expanded={sidebarOpen}
                    >
                        <Icons.Menu className="h-5 w-5" />
                    </Button>

                    <Link
                        href={defaultAppApiName ? `/app/${defaultAppApiName}/dashboard` : "/no-apps"}
                        className="flex shrink-0 items-center gap-2 font-bold text-xl tracking-tight text-foreground transition-opacity hover:opacity-80"
                    >
                        <Image src="/logo.png" alt={t("public.appName")} className="h-6 w-6" width={24} height={24} />
                        <span>{t("public.appName")}</span>
                    </Link>

                    <div className="hidden h-6 w-px bg-border lg:block"></div>

                    {/* App Switcher */}
                    <div className="hidden lg:block">
                        <Select value={currentAppApiName} onValueChange={handleAppChange}>
                            <SelectTrigger className="w-[180px] shrink-0 border-none bg-transparent shadow-none font-semibold text-foreground hover:bg-muted/50 focus:ring-0">
                                <SelectValue placeholder={t("shared.nav.selectApp")} />
                            </SelectTrigger>
                            <SelectContent>
                                {apps.map((app) => (
                                    <SelectItem key={app.id} value={app.apiName}>
                                        <span className="font-medium">{app.name}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Right Section: Search, Notifications, Language & Profile */}
                <div className="ml-4 flex shrink-0 items-center gap-3 lg:gap-4">
                    <div className="hidden w-64 lg:block">
                        <GlobalSearch defaultAppApiName={defaultAppApiName} />
                    </div>
                    <NotificationsMenu currentAppApiName={activeAppApiName} />
                    {isAdmin && (
                        <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="group hidden border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-800 lg:inline-flex"
                        >
                            <Link href="/admin" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5">
                                <Icons.Settings className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
                                <span className="text-xs font-semibold tracking-wide">{t("shared.nav.setup")}</span>
                                <Icons.ExternalLink className="h-3.5 w-3.5 opacity-75" />
                            </Link>
                        </Button>
                    )}
                    <LanguageSelector />
                    <UserNav user={user} profileHref={profileHref} />
                </div>
            </div>
        </header>
    );
}
