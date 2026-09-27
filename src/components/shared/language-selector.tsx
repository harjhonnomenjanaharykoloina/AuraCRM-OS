"use client";

import { useLocale, useSetLocale } from "@/i18n/client";
import type { Locale } from "@/i18n/client";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";

interface LanguageOption {
    value: Locale;
    label: string;
    flag: string;
}

const languages: LanguageOption[] = [
    { value: "en", label: "English", flag: "🇬🇧" },
    { value: "fr", label: "Français", flag: "🇫🇷" },
];

export function LanguageSelector() {
    const locale = useLocale();
    const setLocale = useSetLocale();
    const current = languages.find((l) => l.value === locale);

    return (
        <Select value={locale} onValueChange={(value) => setLocale(value as Locale)}>
            <SelectTrigger className="w-auto gap-1.5 text-sm" aria-label="Select language">
                <span>{current?.flag}</span>
                <span>{current?.value.toUpperCase()}</span>
            </SelectTrigger>
            <SelectContent align="end" className="w-40">
                {languages.map((language) => (
                    <SelectItem key={language.value} value={language.value}>
                        <span className="flex items-center gap-2">
                            <span>{language.flag}</span>
                            <span>{language.label}</span>
                            <span className="text-muted-foreground">
                                ({language.value.toUpperCase()})
                            </span>
                        </span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
