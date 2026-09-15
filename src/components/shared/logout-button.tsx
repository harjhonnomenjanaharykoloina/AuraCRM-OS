"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton() {
    const router = useRouter();

    const handleLogout = async () => {
        await authClient.signOut();
        router.push("/login");
        router.refresh();
    };

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
        </Button>
    );
}
