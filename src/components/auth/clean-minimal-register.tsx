"use client";

import { Building2, Lock, Mail, User, UserRoundPlus } from "lucide-react";
import Image from "next/image";
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

type RegisterFormData = {
    name: string;
    username: string;
    email: string;
    password: string;
    organizationName: string;
};

type CleanMinimalRegisterProps = {
    formData: RegisterFormData;
    error?: string | null;
    fieldErrors?: Partial<Record<keyof RegisterFormData, string>>;
    isLoading?: boolean;
    onChange: (field: keyof RegisterFormData, value: string) => void;
    onSubmit: () => void;
    ctaHref?: string;
    ctaLabel?: string;
    onGoogleSignUp?: () => Promise<void>;
    className?: string;
};

export function CleanMinimalRegister({
    formData,
    error,
    fieldErrors,
    isLoading = false,
    onChange,
    onSubmit,
    ctaHref = "/login",
    ctaLabel,
    onGoogleSignUp,
    className,
}: CleanMinimalRegisterProps) {
    const t = useTranslations();

    const signUpWithGoogle = async () => {
        await authClient.signIn.social({ provider: "google", callbackURL: "/no-apps" });
    };

    const handleGoogleSignUp = async () => {
        const handler = onGoogleSignUp ?? signUpWithGoogle;
        await handler();
    };

    return (
        <div className={cn("w-full", className)}>
            <div className="relative mx-auto w-full max-w-md rounded-3xl border border-slate-200/90 bg-white/95 p-8 text-black shadow-[0_22px_55px_-30px_rgba(30,64,175,0.45)] ring-1 ring-white/80 backdrop-blur-sm">
                <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-sky-200 to-transparent" />

                <div className="mb-6 flex items-center justify-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 shadow-sm">
                        <UserRoundPlus className="h-7 w-7 text-primary" />
                    </div>
                </div>

                {/* White-label logo */}
                <div className="mb-4 flex justify-center">
                    <Image
                        src={process.env.NEXT_PUBLIC_APP_LOGO || "/logo.png"}
                        alt={t("auth.register.appLogo")}
                        width={128}
                        height={48}
                        className="mx-auto max-h-12 w-auto object-contain"
                    />
                </div>

                <h1 className="mb-2 text-center text-2xl font-semibold text-slate-900">{t("auth.register.title")}</h1>
                <p className="mb-6 text-center text-sm text-slate-500">
                    {t("auth.register.subtitle")}
                </p>

                <div className="grid gap-3">
                    <Field
                        icon={<User className="h-4 w-4" />}
                        placeholder={t("auth.register.name")}
                        value={formData.name}
                        error={fieldErrors?.name}
                        isLoading={isLoading}
                        autoComplete="name"
                        onChange={(value) => onChange("name", value)}
                    />
                    <Field
                        icon={<User className="h-4 w-4" />}
                        placeholder={t("auth.register.username")}
                        value={formData.username}
                        error={fieldErrors?.username}
                        isLoading={isLoading}
                        autoComplete="username"
                        onChange={(value) => onChange("username", value)}
                    />
                    <p className="-mt-1 text-xs text-slate-500">{t("auth.register.usernameHelp")}</p>
                    <Field
                        icon={<Building2 className="h-4 w-4" />}
                        placeholder={t("auth.register.organizationName")}
                        value={formData.organizationName}
                        error={fieldErrors?.organizationName}
                        isLoading={isLoading}
                        autoComplete="organization"
                        onChange={(value) => onChange("organizationName", value)}
                    />
                    <Field
                        icon={<Mail className="h-4 w-4" />}
                        placeholder={t("auth.register.email")}
                        type="email"
                        value={formData.email}
                        error={fieldErrors?.email}
                        isLoading={isLoading}
                        autoComplete="email"
                        onChange={(value) => onChange("email", value)}
                    />
                    <Field
                        icon={<Lock className="h-4 w-4" />}
                        placeholder={t("auth.register.password")}
                        type="password"
                        value={formData.password}
                        error={fieldErrors?.password}
                        isLoading={isLoading}
                        autoComplete="new-password"
                        onChange={(value) => onChange("password", value)}
                    />

                    {error ? (
                        <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {error}
                        </div>
                    ) : null}
                </div>

                <Button type="button"
                    onClick={onSubmit}
                    disabled={isLoading}
                    className="mt-4 h-11 w-full rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                    {isLoading ? t("auth.register.submitButtonLoading") : t("auth.register.submitButton")}
                </Button>

                <div className="relative my-4 flex items-center">
                    <div className="flex-grow border-t border-slate-200" />
                    <span className="px-3 text-xs text-slate-400">{t("auth.register.continueWith")}</span>
                    <div className="flex-grow border-t border-slate-200" />
                </div>

                <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-xl border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    disabled={isLoading}
                    onClick={handleGoogleSignUp}
                >
                    <GoogleIcon className="mr-2 h-4 w-4" />
                    {t("auth.register.googleButton")}
                </Button>

                <p className="mt-5 text-center text-sm text-slate-500">
                    {t("auth.register.alreadyRegistered")}{" "}
                    <a href={ctaHref} className="font-medium text-primary hover:underline">
                        {ctaLabel ?? t("auth.register.signIn")}
                    </a>
                </p>
            </div>
        </div>
    );
}

function Field({
    icon,
    placeholder,
    value,
    error,
    onChange,
    isLoading,
    type = "text",
    autoComplete,
}: {
    icon: React.ReactNode;
    placeholder: string;
    value: string;
    error?: string;
    onChange: (value: string) => void;
    isLoading: boolean;
    type?: string;
    autoComplete?: string;
}) {
    return (
        <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
            <Input
                placeholder={placeholder}
                type={type}
                value={value}
                autoComplete={autoComplete}
                disabled={isLoading}
                className={cn(
                    "h-11 rounded-xl bg-white pl-10 text-sm text-slate-900 focus-visible:ring-primary/35",
                    error ? "border-destructive/45" : "border-slate-300"
                )}
                onChange={(e) => onChange(e.target.value)}
                required
            />
            {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
        </div>
    );
}
