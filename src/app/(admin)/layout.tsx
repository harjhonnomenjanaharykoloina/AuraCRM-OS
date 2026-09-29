import { auth } from "@/auth";
import { getSessionUser } from "@/lib/auth/types";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/layout/admin-shell";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    const user = getSessionUser(session);
    if (!user) redirect("/login");

    if (user.userType !== "admin") redirect("/no-apps");

    return <AdminShell user={user}>{children}</AdminShell>;
}
