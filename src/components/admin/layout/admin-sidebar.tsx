"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
} from "@/components/ui/drawer";
import {
    LayoutDashboard,
    Database,
    AppWindow,
    Users,
    Shield,
    ArrowLeft,
    Inbox,
    ListChecks,
    Share2,
    Copy,
    X,
} from "lucide-react";
import { useTranslations } from "@/i18n/client";
import { LogoutButton } from "@/components/shared/logout-button";

interface AdminSidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
}

export function AdminSidebar({ sidebarOpen, setSidebarOpen }: AdminSidebarProps) {
    const pathname = usePathname();
    const t = useTranslations();
    const hideSidebar =
        pathname.includes("/admin/objects/") && pathname.includes("/record-pages/");

    if (hideSidebar) return null;

    const renderNav = () => (
        <>
            {/* Header / Brand */}
            <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
                <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                    <Image src="/logo.png" alt="AuraCRM" className="h-6 w-6" width={24} height={24} />
                    <span>AuraCRM</span>
                    <span className="text-xs font-normal text-sidebar-foreground/70 ml-1 py-0.5 px-1.5 bg-sidebar-accent rounded">
                        Admin
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                        pathname === "/admin" && "bg-sidebar-accent text-sidebar-foreground font-medium"
                    )}
                    asChild
                >
                    <Link href="/admin">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        {t("admin.sidebar.dashboard")}
                    </Link>
                </Button>

                {/* Section: Object Management */}
                <div className="pt-4 pb-2 px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                    {t("admin.sidebar.sections.objectManagement")}
                </div>
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                        pathname.startsWith("/admin/objects") && "bg-sidebar-accent text-sidebar-foreground font-medium"
                    )}
                    asChild
                >
                    <Link href="/admin/objects">
                        <Database className="mr-2 h-4 w-4" />
                        {t("admin.sidebar.objectManager")}
                    </Link>
                </Button>

                {/* Section: Access Control */}
                <div className="pt-4 pb-2 px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                    {t("admin.sidebar.sections.accessControl")}
                </div>
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                        pathname.startsWith("/admin/users") && "bg-sidebar-accent text-sidebar-foreground font-medium"
                    )}
                    asChild
                >
                    <Link href="/admin/users">
                        <Users className="mr-2 h-4 w-4" />
                        {t("admin.sidebar.users")}
                    </Link>
                </Button>
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                        pathname.startsWith("/admin/queues") && "bg-sidebar-accent text-sidebar-foreground font-medium"
                    )}
                    asChild
                >
                    <Link href="/admin/queues">
                        <Inbox className="mr-2 h-4 w-4" />
                        {t("admin.sidebar.queues")}
                    </Link>
                </Button>
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                        pathname.startsWith("/admin/groups") && "bg-sidebar-accent text-sidebar-foreground font-medium"
                    )}
                    asChild
                >
                    <Link href="/admin/groups">
                        <Users className="mr-2 h-4 w-4" />
                        {t("admin.sidebar.groups")}
                    </Link>
                </Button>
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                        pathname.startsWith("/admin/assignment-rules") && "bg-sidebar-accent text-sidebar-foreground font-medium"
                    )}
                    asChild
                >
                    <Link href="/admin/assignment-rules">
                        <ListChecks className="mr-2 h-4 w-4" />
                        {t("admin.sidebar.assignmentRules")}
                    </Link>
                </Button>
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                        pathname.startsWith("/admin/sharing-rules") && "bg-sidebar-accent text-sidebar-foreground font-medium"
                    )}
                    asChild
                >
                    <Link href="/admin/sharing-rules">
                        <Share2 className="mr-2 h-4 w-4" />
                        {t("admin.sidebar.sharingRules")}
                    </Link>
                </Button>
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full justify-start pl-9 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                        pathname.startsWith("/admin/duplicate-rules") && "bg-sidebar-accent text-sidebar-foreground font-medium"
                    )}
                    asChild
                >
                    <Link href="/admin/duplicate-rules">
                        <Copy className="mr-2 h-4 w-4" />
                        {t("admin.sidebar.duplicateRules")}
                    </Link>
                </Button>
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                        pathname.startsWith("/admin/permissions") && "bg-sidebar-accent text-sidebar-foreground font-medium"
                    )}
                    asChild
                >
                    <Link href="/admin/permissions">
                        <Shield className="mr-2 h-4 w-4" />
                        {t("admin.sidebar.permissionSets")}
                    </Link>
                </Button>
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                        pathname.startsWith("/admin/permission-groups") && "bg-sidebar-accent text-sidebar-foreground font-medium"
                    )}
                    asChild
                >
                    <Link href="/admin/permission-groups">
                        <Users className="mr-2 h-4 w-4" />
                        {t("admin.sidebar.permissionGroups")}
                    </Link>
                </Button>

                {/* Section: Platform */}
                <div className="pt-4 pb-2 px-3 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                    {t("admin.sidebar.sections.platform")}
                </div>
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                        pathname.startsWith("/admin/apps") && "bg-sidebar-accent text-sidebar-foreground font-medium"
                    )}
                    asChild
                >
                    <Link href="/admin/apps">
                        <AppWindow className="mr-2 h-4 w-4" />
                        {t("admin.sidebar.appBuilder")}
                    </Link>
                </Button>
            </nav>

            {/* Footer / Profile */}
            <div className="p-4 border-t border-sidebar-border space-y-2">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    asChild
                >
                    <Link href="/app/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t("admin.sidebar.backToApp")}
                    </Link>
                </Button>
                <div className="pt-2">
                    <LogoutButton />
                </div>
            </div>
        </>
    );

    return (
        <>
            {/* Desktop fixed sidebar */}
            <aside className="pb-12 w-64 bg-sidebar text-sidebar-foreground h-screen sticky top-0 hidden md:flex flex-col border-r border-sidebar-border transition-all duration-300">
                {renderNav()}
            </aside>

            {/* Mobile drawer */}
            <div className="md:hidden">
                <Drawer
                    open={sidebarOpen}
                    onOpenChange={setSidebarOpen}
                    direction="left"
                >
                    <DrawerContent className="!w-64 p-0 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
                        <DrawerClose asChild>
                            <button
                                type="button"
                                className="absolute top-3 right-3 z-10 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </DrawerClose>
                        {renderNav()}
                    </DrawerContent>
                </Drawer>
            </div>
        </>
    );
}
