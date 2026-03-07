"use client";

import { cn } from "../../lib/utils";
import React, { useState } from "react";

interface MenuCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    ctaLabel: string;
    isActive: boolean;
    onClick: () => void;
    className?: string;
    colorClass?: string;
}

function MenuCard({
    icon,
    title,
    description,
    ctaLabel,
    isActive,
    onClick,
    className,
    colorClass = "text-blue-500",
}: MenuCardProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "group relative flex min-h-[224px] w-full flex-col justify-between overflow-hidden rounded-[26px] border p-5 text-left transition-all duration-500 sm:min-h-[280px] sm:p-7",
                "bg-white/85 backdrop-blur-md hover:border-blue-400/40",
                "transform-gpu shadow-[0_18px_60px_-32px_rgba(15,23,42,0.28)] hover:-translate-y-1 hover:shadow-[0_22px_70px_-28px_rgba(15,23,42,0.34)]",
                "before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-500/5 before:to-transparent before:opacity-0 before:transition-opacity before:duration-700 hover:before:opacity-100",
                isActive && "border-blue-500/60 shadow-[0_22px_70px_-28px_rgba(59,130,246,0.35)]",
                className
            )}
        >
            <div className="relative z-10 flex flex-col gap-5 sm:gap-6">
                <div
                    className={cn(
                        "inline-flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-700 sm:h-16 sm:w-16",
                        "bg-blue-50 group-hover:bg-blue-100 group-hover:scale-105",
                        isActive && "bg-blue-100 scale-110"
                    )}
                >
                    <div
                        className={cn(
                            "transition-all duration-700",
                            colorClass,
                            "group-hover:scale-110",
                            isActive && "scale-110"
                        )}
                    >
                        {icon}
                    </div>
                </div>

                <div className="flex flex-col gap-3 text-left">
                    <h2
                        className={cn(
                            "text-2xl font-black uppercase tracking-tight transition-all duration-700 sm:text-3xl",
                            "text-gray-900 md:group-hover:translate-x-2",
                            isActive && "translate-x-2"
                        )}
                    >
                        {title}
                    </h2>
                    <p
                        className={cn(
                            "max-w-[24rem] text-sm leading-6 text-gray-500 transition-all duration-700 sm:text-base",
                            "group-hover:text-gray-800"
                        )}
                    >
                        {description}
                    </p>
                </div>
            </div>

            <div
                className={cn(
                    "relative z-10 mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] transition-all duration-700 sm:text-sm",
                    colorClass,
                    "opacity-100 translate-x-0 md:opacity-0 md:group-hover:opacity-100 md:group-hover:translate-x-2",
                    isActive && "opacity-100 translate-x-2"
                )}
            >
                <span>{ctaLabel}</span>
                <svg
                    className="h-4 w-4 transition-transform duration-700 group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                    />
                </svg>
            </div>

            <div
                className={cn(
                    "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700",
                    "bg-gradient-to-t from-blue-500/10 via-transparent to-transparent",
                    "group-hover:opacity-100"
                )}
            />
        </button>
    );
}

interface MenuOption {
    id: string;
    icon: React.ReactNode;
    title: string;
    description: string;
}

interface MenuSelectionProps {
    options: MenuOption[];
    onSelect?: (id: string) => void;
    className?: string;
    ctaLabel?: string;
}

export function MenuSelection({
    options = [],
    onSelect,
    className,
    ctaLabel = "Start",
}: MenuSelectionProps) {
    const [activeId, setActiveId] = useState<string | null>(null);

    const handleSelect = (id: string) => {
        setActiveId(id);
        onSelect?.(id);
    };

    return (
        <div
            className={cn(
                "flex w-full items-center justify-center",
                className
            )}
        >
            <div className="w-full max-w-6xl">
                <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
                    {options.map((option, idx) => (
                        <MenuCard
                            key={option.id}
                            icon={option.icon}
                            title={option.title}
                            description={option.description}
                            ctaLabel={ctaLabel}
                            isActive={activeId === option.id}
                            onClick={() => handleSelect(option.id)}
                            colorClass={idx === 0 ? "text-violet-600" : "text-emerald-600"}
                            className={idx === 0 ? "hover:border-violet-400/40 before:from-violet-500/5 group-hover:before:opacity-100" : "hover:border-emerald-400/40 before:from-emerald-500/5 group-hover:before:opacity-100"}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
