"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { useTranslations } from "@/i18n/client";
import {
    getCommandItems,
    type CommandItem as CommandItemRecord,
    type CommandCategory,
} from "@/actions/standard/command-actions";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";

const DEBOUNCE_MS = 250;

function ItemIcon({ name }: { name: string }): React.ReactElement {
    const Icon = (Icons as any)[name] ?? Icons.Box;
    return <Icon className="h-4 w-4" />;
}

function itemValue(item: CommandItemRecord): string {
    let value = `${item.label} ${item.objectApiName}`;
    if (item.recordId != null) {
        value += ` ${item.recordId}`;
    }
    return value;
}

export interface CommandPaletteHandle {
    open: () => void;
    toggle: () => void;
    close: () => void;
    CommandPalette: React.ReactNode;
}

export function useCommandPalette(): CommandPaletteHandle {
    const router = useRouter();
    const t = useTranslations();

    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [items, setItems] = useState<CommandItemRecord[]>([])
    const [loading, setLoading] = useState(false);

    const itemsRef = useRef(items);
    useEffect(() => { itemsRef.current = items; }, [items]);

    const openPalette = useCallback(() => setOpen(true), []);
    const closePalette = useCallback(() => {
        setOpen(false);
        setSearch("");
        setItems([]);
    }, []);
    const togglePalette = useCallback(() => setOpen((o) => !o), []);

    const openRef = useRef(open);
    useEffect(() => { openRef.current = open; }, [open]);

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                if (openRef.current) {
                    closePalette();
                } else {
                    openPalette();
                }
            }
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [closePalette, openPalette]);

    useEffect(() => {
        if (!open) return;

        const aborted = { value: false };
        const timer = setTimeout(() => {
            if (itemsRef.current.length === 0) {
                setLoading(true);
            }
            getCommandItems(search)
                .then((result) => {
                    if (!aborted.value) setItems(result);
                })
                .catch(() => {
                    if (!aborted.value) setItems([]);
                })
                .finally(() => {
                    if (!aborted.value) setLoading(false);
                });
        }, search ? DEBOUNCE_MS : 0);

        return () => {
            aborted.value = true;
            clearTimeout(timer);
        };
    }, [open, search]);

    const handleSelect = useCallback(
        (item: CommandItemRecord) => {
            router.push(item.href);
            closePalette();
        },
        [router, closePalette]
    );

    const grouped: Record<CommandCategory, CommandItemRecord[]> = {
        object: items.filter((i) => i.category === "object"),
        record: items.filter((i) => i.category === "record"),
        action: items.filter((i) => i.category === "action"),
    };

    const hasContent = grouped.object.length > 0 || grouped.record.length > 0 || grouped.action.length > 0;

    const renderItem = (item: CommandItemRecord) => (
        <CommandItem
            key={item.id}
            value={itemValue(item)}
            onSelect={() => handleSelect(item)}
            className="cursor-pointer"
        >
            <ItemIcon name={item.icon} />
            <span className="truncate">{item.label}</span>
            {item.category === "action" && (
                <kbd className="ml-auto text-xs text-muted-foreground">Action</kbd>
            )}
        </CommandItem>
    );

    const CommandPalette = (
        <CommandDialog open={open} onOpenChange={(next) => (next ? openPalette() : closePalette())}>
            <CommandInput placeholder={t("shared.common.search")} value={search} onValueChange={setSearch} />
            <CommandList>
                {loading && items.length === 0 && (
                    <CommandItem disabled forceMount className="py-6">
                        <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("standard.commandPalette.searching")}
                    </CommandItem>
                )}
                {(!loading || items.length > 0) && !hasContent && (
                    <CommandEmpty>{t("standard.commandPalette.noResults")}</CommandEmpty>
                )}
                {!loading && items.length > 0 && (
                    <>
                        <CommandGroup heading={t("shared.nav.objects")}>
                            {grouped.object.map(renderItem)}
                        </CommandGroup>
                        {grouped.record.length > 0 && (
                            <>
                                <CommandSeparator />
                                <CommandGroup heading={t("standard.commandPalette.recent")}>{grouped.record.map(renderItem)}</CommandGroup>
                            </>
                        )}
                        {grouped.action.length > 0 && (
                            <>
                                <CommandSeparator />
                                <CommandGroup heading={t("shared.common.actions")}>
                                    {grouped.action.map(renderItem)}
                                </CommandGroup>
                            </>
                        )}
                    </>
                )}
            </CommandList>
        </CommandDialog>
    );

    return { open: openPalette, toggle: togglePalette, close: closePalette, CommandPalette };
}
