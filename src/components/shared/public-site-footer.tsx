import { Poppins } from "next/font/google";

const headingFont = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export function PublicSiteFooter() {
    return (
        <footer className="border-t border-slate-200 bg-slate-50 py-12">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="AuraCRM" className="h-8 w-8" />
                        <span className={`${headingFont.className} font-semibold text-slate-900`}>AuraCRM</span>
                    </div>
                    <p className="text-sm text-slate-600">
                        Open source under MIT license.
                    </p>
                </div>
            </div>
        </footer>
    );
}
