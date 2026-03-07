import React, { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import { loginStudent } from "../lib/api";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// utility for classes
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const LoginPage = () => {
    const { setStudent } = useAuthStore();
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await loginStudent(username, password);
            setStudent(response);
            navigate("/dashboard");
        } catch (loginError) {
            const message = loginError instanceof Error ? loginError.message : "Ошибка входа";
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
        <section className="bg-slate-50 min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="relative z-10 p-8"
                    >
                        <motion.div variants={itemVariants} className="mb-8 text-center">
                            <h1 className="text-3xl font-semibold text-slate-900">Портал Ученика</h1>
                            <p className="mt-2 text-sm text-slate-500">Войдите для доступа к платформе</p>
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
                                    Логин
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    placeholder="Введите логин"
                                    value={username}
                                    onChange={(event) => setUsername(event.target.value)}
                                    disabled={isLoading}
                                    className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                />
                            </motion.div>

                            <motion.div variants={itemVariants} className="space-y-2">
                                <label
                                    htmlFor="password"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-900"
                                >
                                    Пароль
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        disabled={isLoading}
                                        className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 pr-10 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-0 top-0 h-full px-3 py-2 text-slate-500 hover:text-slate-900 focus:outline-none disabled:opacity-50"
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
                                    className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-11"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Вход...
                                        </>
                                    ) : (
                                        "Войти"
                                    )}
                                </button>
                            </motion.div>
                        </form>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default LoginPage;
