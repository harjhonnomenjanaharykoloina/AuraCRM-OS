"use client";

import * as React from "react";
import { LogIn, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/client";
import { authClient } from "@/lib/auth-client";

function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            width={18}
            height={18}
        >
            <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.67 1.22 9.09 3.61l-3.57 3.57C28.07 13.98 26.18 13.5 24 13.5c-5.3 0-9.76 3.95-10.47 9.18l-3.95-3.1C8.55 15.79 15.66 9.5 24 9.5z"
            />
            <path
                fill="#4285F4"
                d="M43.81 20.01H24v8.27h11.17v5.45h0.16c1.19-1.1 2.19-2.4 2.97-3.85 1.85-3.16 2.88-6.88 2.88-10.92 0-1.89-.27-3.73-.75-5.48z"
            />
            <path
                fill="#FBBC05"
                d="M9.53 28.01c.73 2.23 1.9 4.22 3.43 5.87l-.03.02c1.76 1.66 3.78 2.99 5.97 3.86-.1.85-1.17 1.39-2.33 1.54-2.1.19-3.87-.41-4.93-1.65-1.14-1.33-1.64-3.07-1.32-4.77z"
            />
            <path
                fill="#34A853"
                d="M24 43.5c2.43 0 4.73-.38 6.86-1.1l3.1-1.18c.56-.21.88-.7 1.1-1.32.18-.5.2-1.05.1-1.56-.12-.61-.4-1.14-.9-1.42-.5-.27-1.07-.32-1.61-.16-1.32.43-2.47 1.19-3.53 2.25-2.15 2.15-3.5 5.04-3.5 8.01 0 .52.05 1.03.16 1.53.06.33.17.65.32.95.14.29.35.54.57.77z"
            />
        </svg>
    );
}

type CleanMinimalSignInProps = {
    identifier: string;
    password: string;
    error?: string | null;
    isLoading?: boolean;
    submitDisabled?: boolean;
    onIdentifierChange: (value: string) => void;
    onPasswordChange: (value: string) => void;
    ctaHref?: string;
    ctaLabel?: string;
    onGoogleSignIn?: () => Promise<void>;
    className?: string;
};

export function CleanMinimalSignIn({
    identifier,
    password,
    error,
    isLoading = false,
    submitDisabled = false,
    onIdentifierChange,
    onPasswordChange,
    ctaHref = "/register",
    ctaLabel,
    onGoogleSignIn,
    className,
}: CleanMinimalSignInProps) {
    const t = useTranslations();

    const signInWithGoogle = async () => {
        await authClient.signIn.social({ provider: "google", callbackURL: "/no-apps" });
    };

    const handleGoogleSignIn = async () => {
        const handler = onGoogleSignIn ?? signInWithGoogle;
        await handler();
    };

    return (
        <div className={cn("w-full", className)}>
            <div className="relative mx-auto w-full max-w-sm rounded-3xl border border-slate-200/90 bg-white/95 p-8 text-black shadow-[0_22px_55px_-30px_rgba(30,64,175,0.45)] ring-1 ring-white/80 backdrop-blur-sm">
                <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-sky-200 to-transparent" />
                <div className="mb-6 flex items-center justify-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 shadow-sm">
                        <LogIn className="h-7 w-7 text-primary" />
                    </div>
                </div>

                <h1 className="select-none mb-2 text-center text-2xl font-semibold text-slate-900">{t("auth.signIn.title")}</h1>
                <p className="select-none cursor-default mb-6 text-center text-sm text-slate-500">
                    {t("auth.signIn.helpText")}
                </p>

                <div className="flex flex-col gap-3">
                    <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <User className="h-4 w-4" />
                        </span>
                        <Input
                            placeholder={t("auth.signIn.username")}
                            type="text"
                            value={identifier}
                            autoComplete="username"
                            disabled={isLoading}
                            className="h-11 rounded-xl border-slate-300 bg-white pl-10 text-sm text-slate-900 focus-visible:ring-primary/35"
                            onChange={(e) => onIdentifierChange(e.target.value)}
                        />
                    </div>

                    <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <Lock className="h-4 w-4" />
                        </span>
                        <Input
                            placeholder={t("auth.signIn.password")}
                            type="password"
                            value={password}
                            autoComplete="current-password"
                            disabled={isLoading}
                            className="h-11 rounded-xl border-slate-300 bg-white pl-10 text-sm text-slate-900 focus-visible:ring-primary/35"
                            onChange={(e) => onPasswordChange(e.target.value)}
                        />
                    </div>

                    {error ? (
                        <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {error}
                        </div>
                    ) : null}
                </div>

                <Button
                    type="submit"
                    disabled={isLoading || submitDisabled}
                    className="mt-4 h-11 w-full rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                    {isLoading ? t("auth.signIn.submitButtonLoading") : t("auth.signIn.submitButton")}
                </Button>

                <div className="relative my-4 flex items-center">
                    <div className="flex-grow border-t border-slate-200" />
                    <span className="px-3 text-xs text-slate-400">{t("auth.signIn.continueWith")}</span>
                    <div className="flex-grow border-t border-slate-200" />
                </div>

                <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-xl border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    disabled={isLoading}
                    onClick={handleGoogleSignIn}
                >
                    <GoogleIcon className="mr-2 h-4 w-4" />
                    {t("auth.signIn.googleButton")}
                </Button>

                <p className="select-none cursor-default mt-5 text-center text-sm text-slate-500">
                    {t("auth.signIn.newHere")}{" "}
                    <a href={ctaHref} className="font-medium text-primary hover:underline">
                        {ctaLabel ?? t("auth.signIn.createAccount")}
                    </a>
                </p>
            </div>
        </div>
    );
}
