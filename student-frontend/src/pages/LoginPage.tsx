import React, { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import { loginStudent } from "../lib/api";
import { getPortalCopy } from "../lib/portalI18n";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, ShieldCheck, UserRound } from "lucide-react";

const LoginPage = () => {
    const { setStudent, preferredLanguage } = useAuthStore();
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const copy = getPortalCopy(preferredLanguage);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await loginStudent(username, password);
            setStudent(response);
            navigate("/dashboard");
        } catch (loginError) {
            const message = loginError instanceof Error ? loginError.message : copy.loginError;
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 },
        },
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 },
    };

    return (
        <section className="relative min-h-screen overflow-hidden px-4 py-5 sm:px-6 sm:py-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_22%)]" />
            <div className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-md items-center">
                <div className="w-full overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/95 shadow-[0_30px_90px_-36px_rgba(15,23,42,0.35)] backdrop-blur">
                    <div className="border-b border-slate-100 px-5 py-5 sm:px-8 sm:py-6">
                        <div className="mb-4 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                {copy.secureLogin}
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                <UserRound className="h-3.5 w-3.5" />
                                {copy.individualAccess}
                            </span>
                        </div>
                        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{copy.portalTitle}</h1>
                        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 sm:text-[15px]">
                            {copy.loginDescription}
                        </p>
                    </div>

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="relative z-10 p-5 sm:p-8"
                    >
                        <motion.div variants={itemVariants} className="mb-6 sm:mb-8">
                            <div className="grid grid-cols-2 gap-3 rounded-[22px] border border-slate-200 bg-slate-50 p-3 sm:p-4">
                                <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{copy.loginFormatLabel}</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900">{copy.loginFormatValue}</p>
                                </div>
                                <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{copy.loginDeviceLabel}</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900">{copy.loginDeviceValue}</p>
                                </div>
                            </div>
                        </motion.div>

                        {error && (
                            <motion.div
                                variants={itemVariants}
                                className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                            >
                                {error}
                            </motion.div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-6">
                            <motion.div variants={itemVariants} className="space-y-2">
                                <label
                                    htmlFor="username"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-900"
                                >
                                    {copy.usernameLabel}
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    placeholder={copy.usernamePlaceholder}
                                    value={username}
                                    onChange={(event) => setUsername(event.target.value)}
                                    disabled={isLoading}
                                    className="flex h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    required
                                />
                            </motion.div>

                            <motion.div variants={itemVariants} className="space-y-2">
                                <label
                                    htmlFor="password"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-900"
                                >
                                    {copy.passwordLabel}
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        disabled={isLoading}
                                        className="flex h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-base placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-0 top-0 h-full px-4 py-2 text-slate-500 hover:text-slate-900 focus:outline-none disabled:opacity-50"
                                        onClick={() => setShowPassword(!showPassword)}
                                        disabled={isLoading}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </motion.div>

                            <motion.div variants={itemVariants}>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="inline-flex h-12 w-full items-center justify-center whitespace-nowrap rounded-xl bg-blue-600 px-4 text-base font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {copy.signingIn}
                                        </>
                                    ) : (
                                        copy.signIn
                                    )}
                                </button>
                            </motion.div>
                        </form>

                        <motion.p variants={itemVariants} className="mt-5 text-center text-xs leading-5 text-slate-400 sm:text-sm">
                            {copy.loginHint}
                        </motion.p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default LoginPage;
