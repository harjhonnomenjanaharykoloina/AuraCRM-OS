"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { useTranslations } from "@/i18n/client";

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 2;

interface SearchResult {
    id: number;
    name: string;
    objectApiName: string;
    objectLabel: string;
    rank: number;
}

interface SearchResponse {
    results: SearchResult[];
}

export default function CommandPalette() {
    const router = useRouter();
    const t = useTranslations();

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                setOpen(true);
            }
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, []);

    useEffect(() => {
        if (!open || query.length < MIN_QUERY_LENGTH) {
            setResults([]);
            setLoading(false);
            return;
        }

        const aborted = { value: false };
        const timer = setTimeout(() => {
            setLoading(true);
            fetch(`/api/search/global?q=${encodeURIComponent(query)}&object=all`)
                .then(async (res) => {
                    if (aborted.value) return;
                    if (!res.ok) {
                        setResults([]);
                        return;
                    }
                    const data = (await res.json()) as SearchResponse;
                    if (aborted.value) return;
                    setResults(data.results ?? []);
                })
                .catch(() => {
                    if (!aborted.value) setResults([]);
                })
                .finally(() => {
                    if (!aborted.value) setLoading(false);
                });
        }, DEBOUNCE_MS);

        return () => {
            aborted.value = true;
            clearTimeout(timer);
        };
    }, [open, query]);

    const grouped = results.reduce<Record<string, SearchResult[]>>((acc, result) => {
        const key = result.objectApiName ?? "other";
        if (!acc[key]) acc[key] = [];
        acc[key].push(result);
        return acc;
    }, {});

    const showEmpty = query.length >= MIN_QUERY_LENGTH && results.length === 0;

    const handleSelect = (item: SearchResult) => {
        router.push(`/${item.objectApiName}/${item.id}`);
        setOpen(false);
        setQuery("");
        setResults([]);
    };

    return (
        <CommandDialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) {
                    setQuery("");
                    setResults([]);
                }
            }}
            title={t("standard.commandPalette.open")}
            description={t("standard.commandPalette.shortcut")}
        >
            <CommandInput
                placeholder={t("standard.commandPalette.search")}
                value={query}
                onValueChange={setQuery}
            />
            <CommandList>
                {loading ? (
                    <CommandItem disabled className="py-6">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    </CommandItem>
                ) : showEmpty ? (
                    <CommandEmpty>{t("standard.commandPalette.noResults")}</CommandEmpty>
                ) : null}
                {!loading && results.length > 0 && (
                    <CommandGroup heading={t("standard.commandPalette.records")}>
                        {Object.values(grouped)
                            .flat()
                            .map((item) => (
                                <CommandItem
                                    key={`${item.objectApiName}-${item.id}`}
                                    value={`${item.name} ${item.objectLabel} ${item.id}`}
                                    onSelect={() => handleSelect(item)}
                                    className="cursor-pointer"
                                >
                                    <span className="truncate">{item.name}</span>
                                    <small className="ml-auto text-xs text-muted-foreground">
                                        {item.objectLabel}
                                    </small>
                                </CommandItem>
                            ))}
                    </CommandGroup>
                )}
            </CommandList>
        </CommandDialog>
    );
}