"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Menu, X, Mic, Download } from "lucide-react";

const IS_LOCAL = process.env.NEXT_PUBLIC_APP_MODE === "local";

const localNavItems = [
  { href: "/", label: "Start" },
  { href: "/upload", label: "Ny transkription" },
  { href: "/anonymize", label: "Avidentifiera" },
  { href: "/jobs", label: "Mina jobb" },
];

const marketingNavItems = [
  { href: "#features", label: "Funktioner" },
  { href: "#download", label: "Ladda ner" },
  { href: "#guide", label: "Guider" },
];

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  const navItems = IS_LOCAL ? localNavItems : marketingNavItems;

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Track scroll for marketing header transparency
  useEffect(() => {
    if (IS_LOCAL) return;
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={clsx(
        "sticky top-0 z-50 transition-all duration-300",
        IS_LOCAL
          ? "bg-white border-b border-gray-200"
          : scrolled
            ? "bg-dark-950/95 backdrop-blur-md border-b border-white/10 shadow-lg"
            : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link
            href="/"
            className={clsx(
              "flex items-center gap-2 font-semibold",
              IS_LOCAL ? "text-gray-900" : "text-white"
            )}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <span>TystText</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isAnchor = item.href.startsWith("#");
              const isActive = isAnchor
                ? false
                : item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              if (isAnchor) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                      scrolled
                        ? "text-gray-300 hover:text-white hover:bg-white/10"
                        : "text-gray-300 hover:text-white hover:bg-white/10"
                    )}
                  >
                    {item.label}
                  </a>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Marketing CTA button */}
            {!IS_LOCAL && (
              <a
                href="#download"
                className="ml-2 flex items-center gap-1.5 px-4 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Ladda ner
              </a>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={clsx(
              "md:hidden p-2 rounded-md",
              IS_LOCAL
                ? "text-gray-600 hover:bg-gray-100"
                : "text-gray-300 hover:bg-white/10"
            )}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <nav
          className={clsx(
            "md:hidden border-t px-4 py-2 space-y-1",
            IS_LOCAL
              ? "border-gray-200 bg-white"
              : "border-white/10 bg-dark-950/95 backdrop-blur-md"
          )}
        >
          {navItems.map((item) => {
            const isAnchor = item.href.startsWith("#");
            const isActive = isAnchor
              ? false
              : item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            if (isAnchor) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {item.label}
                </a>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
