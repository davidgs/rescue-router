import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type SVGProps,
} from "react";
import { useTheme, type ThemePreference } from "../lib/theme";

const options: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const glyphCls = "h-[1.125rem] w-[1.125rem] shrink-0";

function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
      />
    </svg>
  );
}

function MoonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
      />
    </svg>
  );
}

function SystemIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m3-12v9a2.25 2.25 0 0 1-2.25 2.25H8.25A2.25 2.25 0 0 1 6 14.25V5.25A2.25 2.25 0 0 1 8.25 3h7.5A2.25 2.25 0 0 1 18 5.25Z"
      />
    </svg>
  );
}

function ChevronIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m19.5 8.25-7.5 7.5-7.5-7.5"
      />
    </svg>
  );
}

function ThemeGlyph({ value }: { value: ThemePreference }) {
  if (value === "light") return <SunIcon className={glyphCls} />;
  if (value === "dark") return <MoonIcon className={glyphCls} />;
  return <SystemIcon className={glyphCls} />;
}

/**
 * Theme preference as a compact icon button with an accessible menu of icon choices.
 */
export function ThemeSwitcher() {
  const { preference, setPreference } = useTheme();
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const currentLabel =
    options.find((o) => o.value === preference)?.label ?? "System";

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        className="flex items-center gap-1 rounded-xl border border-[var(--rr-header-border)] bg-[var(--rr-header-elevated)] px-2 py-1.5 text-[var(--rr-header-text)] shadow-sm transition hover:bg-[var(--rr-header-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--rr-focus-ring)]"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={`Color theme: ${currentLabel}. Choose light, dark, or system.`}
        onClick={() => setOpen((v) => !v)}
      >
        <ThemeGlyph value={preference} />
        <ChevronIcon
          className={`h-3.5 w-3.5 shrink-0 text-[var(--rr-header-muted)] transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Color theme"
          className="absolute right-0 z-[100] mt-1 min-w-[11rem] rounded-xl border border-[var(--rr-header-border)] bg-[var(--rr-header-elevated)] py-1 shadow-lg"
        >
          {options.map((opt) => {
            const selected = preference === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium transition ${
                  selected
                    ? "bg-[var(--rr-accent)]/15 text-[var(--rr-header-text)]"
                    : "text-[var(--rr-header-muted)] hover:bg-[var(--rr-header-hover)] hover:text-[var(--rr-header-text)]"
                }`}
                onClick={() => {
                  setPreference(opt.value);
                  close();
                  triggerRef.current?.focus();
                }}
              >
                <ThemeGlyph value={opt.value} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
