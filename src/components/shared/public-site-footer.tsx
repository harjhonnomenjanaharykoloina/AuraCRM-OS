"use client";

import { poppins as headingFont } from "@/lib/fonts";
import Image from "next/image";
import { useTranslations } from "@/i18n/client";

export function PublicSiteFooter() {
    const t = useTranslations();

    return (
        <footer className="border-t border-slate-200 bg-slate-50 py-12">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                    <div className="flex items-center gap-2">
                        <Image src="/logo.png" alt="AuraCRM" className="h-8 w-8" width={32} height={32} />
                        <span className={`${headingFont.className} font-semibold text-slate-900`}>AuraCRM</span>
                    </div>
                    <p className="text-sm text-slate-600">
                        {t("public.footer.license")}
                    </p>
                </div>
            </div>
        </footer>
    );
}
