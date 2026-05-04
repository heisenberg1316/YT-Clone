"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = string | undefined;

type ThemeContextType = {
    theme: Theme;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);


export const ThemeProvider = ({ children, themeValue }: { children: React.ReactNode, themeValue : Theme }) => {
    const [theme, setTheme] = useState<Theme>(themeValue);

    useEffect(() => {
        const root = document.documentElement;
        const isDark = root.classList.contains("dark");
        setTheme(isDark ? "dark" : "light");
    }, []);

    const toggleTheme = () => {
        const root = document.documentElement;
        const nextTheme = theme === "dark" ? "light" : "dark";

        root.classList.toggle("dark", nextTheme === "dark");
        document.cookie = `theme=${nextTheme}; path=/; max-age=31536000`;

        setTheme(nextTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

// custom hook (important ✨)
export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
    return ctx;
};
