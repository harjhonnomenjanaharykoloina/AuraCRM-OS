import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function ObjectListLoading() {
    const columns = 5;
    const rows = 5;

    return (
        <div className="space-y-5">
            <div className="rounded-xl border border-border/60 bg-white shadow-sm">
                <div className="px-6 py-4 border-b border-border/50">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <Skeleton className="h-3 w-24 rounded" />
                            <Skeleton className="h-7 w-40 mt-2 rounded" />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Skeleton className="h-9 w-32 rounded" />
                            <Skeleton className="h-9 w-24 rounded" />
                            <Skeleton className="h-9 w-28 rounded" />
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Skeleton className="h-9 w-[220px] rounded" />
                        <div className="flex flex-wrap items-center gap-2">
                            <Skeleton className="h-8 w-8 rounded" />
                            <Skeleton className="h-8 w-8 rounded" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow className="border-b border-border/60">
                            {Array.from({ length: columns }).map((_, colIndex) => (
                                <TableHead key={colIndex} className="h-11">
                                    <Skeleton className="h-3 w-20 rounded" />
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: rows }).map((_, rowIndex) => (
                            <TableRow key={rowIndex} className="border-b border-border/40 last:border-0">
                                {Array.from({ length: columns }).map((_, colIndex) => (
                                    <TableCell key={colIndex} className="py-3">
                                        <Skeleton className="h-4 w-full rounded" />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-2">
                <Skeleton className="h-3 w-40 rounded" />
                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-5 w-12 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                </div>
            </div>
        </div>
    );
}
