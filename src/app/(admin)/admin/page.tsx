import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, ShieldCheck, UserPlus, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { DemoDataButton } from "@/components/admin/demo-data-button";
import { getT } from "@/i18n/server";

export default async function AdminDashboardPage() {
    const t = await getT();
    return (
        <div className="space-y-8">
            {/* Header */}
            
                <DemoDataButton />
            

            {/* How It Works Section */}
            <div className="space-y-6">
                <div>
                    <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2 text-foreground">
                        {t("admin.dashboard.setupGuide")}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {t("admin.dashboard.followSteps")}
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

                    {/* Step 1 */}
                    <Card className="shadow-sm border-border/60 hover:shadow-md transition-all group overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/80"></div>
                        <CardHeader className="pb-2">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Database className="h-5 w-5 text-blue-600" />
                            </div>
                            <CardTitle className="text-base font-semibold">{t("admin.dashboard.step1Title")}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-3">
                            <p>{t("admin.dashboard.step1Description")} <strong>{t("admin.sidebar.objectManager")}</strong>.</p>
                            <ul className="list-disc pl-4 space-y-1 text-xs marker:text-blue-500">
                                <li>{t("admin.dashboard.step1.createObjects")} <strong>{t("admin.dashboard.step1.objects")}</strong> {t("admin.dashboard.step1.objectsExample")}</li>
                                <li>{t("admin.dashboard.step1.addCustomFields")} <strong>{t("admin.dashboard.step1.fields")}</strong></li>
                                <li>{t("admin.dashboard.step1.lookupTargets")}</li>
                                <li>{t("admin.dashboard.step1.pageLayouts")}</li>
                            </ul>
                            <Link href="/admin/objects" className="text-xs font-semibold text-blue-600 hover:underline">
                                {t("admin.dashboard.step1.openLink")}
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Step 2 */}
                    <Card className="shadow-sm border-border/60 hover:shadow-md transition-all group overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/80"></div>
                        <CardHeader className="pb-2">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <LayoutDashboard className="h-5 w-5 text-purple-600" />
                            </div>
                            <CardTitle className="text-base font-semibold">{t("admin.dashboard.step2Title")}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-3">
                            <p>{t("admin.dashboard.step2Description")} <strong>{t("admin.dashboard.step2.appManager")}</strong>.</p>
                            <ul className="list-disc pl-4 space-y-1 text-xs marker:text-purple-500">
                                <li>{t("admin.dashboard.step2.createApp")} <strong>{t("admin.dashboard.step2.app")}</strong> {t("admin.dashboard.step2.containers")}</li>
                                <li>{t("admin.dashboard.step2.configureNav")} <strong>{t("admin.dashboard.step2.navigation")}</strong></li>
                                <li>{t("admin.dashboard.step2.designDashboard")} <strong>{t("admin.dashboard.step2.widgets")}</strong></li>
                                <li>{t("admin.dashboard.step2.assignApps")}</li>
                            </ul>
                            <Link href="/admin/apps" className="text-xs font-semibold text-purple-600 hover:underline">
                                {t("admin.dashboard.step2.openLink")}
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Step 3 */}
                    <Card className="shadow-sm border-border/60 hover:shadow-md transition-all group overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/80"></div>
                        <CardHeader className="pb-2">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <ShieldCheck className="h-5 w-5 text-amber-600" />
                            </div>
                            <CardTitle className="text-base font-semibold">{t("admin.dashboard.step3Title")}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-3">
                            <p>{t("admin.dashboard.step3Description")} <strong>{t("admin.sidebar.permissionSets")}</strong>.</p>
                            <ul className="list-disc pl-4 space-y-1 text-xs marker:text-amber-500">
                                <li>{t("admin.dashboard.step3.define")} <strong>{t("admin.sidebar.permissionSets")}</strong></li>
                                <li>{t("admin.dashboard.step3.crud")}</li>
                                <li>{t("admin.dashboard.step3.permissionGroups")}</li>
                                <li>{t("admin.dashboard.step3.queuesSharing")}</li>
                                <li>{t("admin.dashboard.step3.duplicateRules")}</li>
                                <li>{t("admin.dashboard.step3.assignmentRules")}</li>
                            </ul>
                            <div className="flex flex-wrap gap-2 text-xs font-semibold">
                                <Link href="/admin/permissions" className="text-amber-600 hover:underline">
                                    {t("admin.sidebar.permissionSets")}
                                </Link>
                                <span className="text-amber-400">•</span>
                                <Link href="/admin/queues" className="text-amber-600 hover:underline">
                                    {t("admin.sidebar.queues")}
                                </Link>
                                <span className="text-amber-400">•</span>
                                <Link href="/admin/sharing-rules" className="text-amber-600 hover:underline">
                                    {t("admin.sidebar.sharingRules")}
                                </Link>
                                <span className="text-amber-400">•</span>
                                <Link href="/admin/duplicate-rules" className="text-amber-600 hover:underline">
                                    {t("admin.sidebar.duplicateRules")}
                                </Link>
                                <span className="text-amber-400">•</span>
                                <Link href="/admin/assignment-rules" className="text-amber-600 hover:underline">
                                    {t("admin.sidebar.assignmentRules")}
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Step 4 */}
                    <Card className="shadow-sm border-border/60 hover:shadow-md transition-all group overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/80"></div>
                        <CardHeader className="pb-2">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <UserPlus className="h-5 w-5 text-emerald-600" />
                            </div>
                            <CardTitle className="text-base font-semibold">{t("admin.dashboard.step4Title")}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground space-y-3">
                            <p>{t("admin.dashboard.step4Description")} <strong>{t("admin.header.userManagement")}</strong>{t("admin.dashboard.step4.areaSuffix")}</p>
                            <ul className="list-disc pl-4 space-y-1 text-xs marker:text-emerald-500">
                                <li>{t("admin.dashboard.step4.invite")} <strong>{t("admin.sidebar.users")}</strong></li>
                                <li>{t("admin.dashboard.step4.rolePerms")}</li>
                                <li>{t("admin.dashboard.step4.monitor")}</li>
                                <li>{t("admin.dashboard.step4.groupsQueues")}</li>
                            </ul>
                            <Link href="/admin/users" className="text-xs font-semibold text-emerald-600 hover:underline">
                                {t("admin.dashboard.step4.openLink")}
                            </Link>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}
