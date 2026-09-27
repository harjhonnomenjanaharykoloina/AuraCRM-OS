import { auth } from "@/auth";
import { getSessionUser } from "@/lib/auth/types";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { BuilderLayout } from "@/components/admin/apps/builder/builder-layout";

export default async function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const appId = parseInt(id);
    const session = await auth();
    const user = getSessionUser(session);
    if (!user) redirect("/login");

    const organizationId = user.organizationId;

    const appDef = await db.appDefinition.findUnique({
        where: { id: appId, organizationId },
        include: {
            widgets: true,
        }
    });

    if (!appDef) notFound();

    // Fetch all objects for the config dropdowns
    const objects = await db.objectDefinition.findMany({
        where: { organizationId },
        select: { id: true, label: true, apiName: true, icon: true }
    });

    const queues = await db.queue.findMany({
        where: { organizationId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });

    return (
        <BuilderLayout
            appDef={appDef}
            initialWidgets={appDef.widgets}
            availableObjects={objects}
            availableQueues={queues}
        />
    );
}
