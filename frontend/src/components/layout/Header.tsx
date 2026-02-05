"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { Menu, X, Mic, HelpCircle } from "lucide-react";
import { ConnectionStatus } from "@/components/setup";
import { AboutModal } from "@/components/about";
import { useBackendStatusContext } from "@/contexts/BackendStatusContext";

const navItems = [
  { href: "/", label: "Hem" },
  { href: "/upload", label: "Ny transkription" },
  { href: "/anonymize", label: "Avidentifiera" },
  { href: "/jobs", label: "Mina jobb" },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const pathname = usePathname();
  const { connected, checking, systemInfo, checkConnection, openSetupWizard } =
    useBackendStatusContext();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header
      className={clsx(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200/50"
          : "bg-dark-900/50 backdrop-blur-sm"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className={clsx(
              "flex items-center gap-2.5 font-semibold text-lg transition-colors",
              isScrolled ? "text-gray-900" : "text-white"
            )}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span className="hidden sm:inline">TystText</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? isScrolled
                        ? "bg-primary-50 text-primary-700"
                        : "bg-white/15 text-white"
                      : isScrolled
                        ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side items */}
          <div className="hidden md:flex items-center gap-2">
            {/* Help/About button */}
            <button
              onClick={() => setIsAboutOpen(true)}
              className={clsx(
                "p-2 rounded-lg transition-colors",
                isScrolled
                  ? "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
              aria-label="Om TystText"
              title="Om TystText"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            {/* Connection Status */}
            <ConnectionStatus
              isConnected={connected}
              isChecking={checking}
              systemInfo={systemInfo}
              onRetry={checkConnection}
              onOpenSetup={openSetupWizard}
            />
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={clsx(
              "md:hidden p-2 rounded-lg transition-colors",
              isScrolled
                ? "text-gray-700 hover:bg-gray-100"
                : "text-white hover:bg-white/10"
            )}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={clsx(
          "md:hidden overflow-hidden transition-all duration-300 ease-in-out",
          isMobileMenuOpen ? "max-h-80" : "max-h-0"
        )}
      >
        <nav className="bg-white border-t border-gray-200 shadow-lg px-4 py-3 space-y-1 animate-slide-down">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "block px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                {item.label}
              </Link>
            );
          })}
          {/* Mobile About button */}
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              setIsAboutOpen(true);
            }}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            Om TystText
          </button>
        </nav>
      </div>

      {/* About Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        onOpenSetup={() => {
          setIsAboutOpen(false);
          openSetupWizard();
        }}
      />
    </header>
  );
}
