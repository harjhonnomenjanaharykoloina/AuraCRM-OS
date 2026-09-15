"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CleanMinimalSignIn } from "@/components/auth/clean-minimal-sign-in";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const normalizedUsername = username.trim().toLowerCase();
    const canSubmit = normalizedUsername.length > 0 && password.length > 0;

    const submitLogin = async () => {
        if (!canSubmit) {
            const errorMessage = "Enter your username and password.";
            setError(errorMessage);
            toast.error(errorMessage);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await authClient.signIn.username({
                username: normalizedUsername,
                password,
            });

            if (result.error) {
                setError("Invalid username or password");
                toast.error("Invalid username or password");
            } else {
                toast.success("Logged in successfully");
                router.push("/app/dashboard");
                router.refresh();
            }
        } catch {
            setError("An unexpected error occurred");
            toast.error("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        void submitLogin();
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="w-full"
        >
            <CleanMinimalSignIn
                identifier={username}
                password={password}
                error={error}
                isLoading={isLoading}
                submitDisabled={!canSubmit}
                onIdentifierChange={(value) => {
                    setUsername(value);
                    setError(null);
                }}
                onPasswordChange={(value) => {
                    setPassword(value);
                    setError(null);
                }}
                ctaHref="/register"
                ctaLabel="Create an account"
            />
        </form>
    );
}
