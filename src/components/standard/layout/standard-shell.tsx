"use client";

import { useState } from "react";
import { AppHeader } from "@/components/standard/layout/app-header";
import { StandardSidebar } from "@/components/standard/layout/standard-sidebar";

interface StandardShellProps {
    apps: any[];
    currentAppApiName: string;
    user: any;
    navItems: any[];
    isAdmin: boolean;
    profileHref?: string;
    children: React.ReactNode;
}

export function StandardShell({
    apps,
    currentAppApiName,
    user,
    navItems,
    isAdmin,
    profileHref,
    children,
}: StandardShellProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <>
            <AppHeader
                apps={apps}
                currentAppApiName={currentAppApiName}
                user={user}
                isAdmin={isAdmin}
                profileHref={profileHref}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
            />
            <div className="flex min-h-0 flex-1">
                <StandardSidebar
                    currentAppApiName={currentAppApiName}
                    navItems={navItems}
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                />
                <main className="min-w-0 flex-1 overflow-auto bg-muted/10 p-4 md:p-6">
                    <div className="mx-auto w-full max-w-7xl">{children}</div>
                </main>
            </div>
        </>
    );
}
