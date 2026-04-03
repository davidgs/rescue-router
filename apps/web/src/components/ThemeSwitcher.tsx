import { useTheme, type ThemePreference } from "../lib/theme";

const options: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/**
 * Native radio group: screen readers and keyboard (arrow keys) work per browser defaults.
 */
export function ThemeSwitcher() {
  const { preference, setPreference } = useTheme();

  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="sr-only">Color theme</legend>
      <div className="flex flex-wrap items-center gap-0.5 rounded-xl border border-[var(--rr-header-border)] bg-[var(--rr-header-elevated)] p-1">
        {options.map((opt) => {
          const id = `rr-theme-${opt.value}`;
          const selected = preference === opt.value;
          return (
            <label
              key={opt.value}
              htmlFor={id}
              className={`cursor-pointer select-none rounded-lg px-2.5 py-1.5 text-xs font-semibold transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--rr-focus-ring)] ${
                selected
                  ? "bg-[var(--rr-accent)] text-[var(--rr-on-accent)] shadow-sm"
                  : "text-[var(--rr-header-muted)] hover:bg-[var(--rr-header-hover)] hover:text-[var(--rr-header-text)]"
              }`}
            >
              <input
                id={id}
                type="radio"
                name="rr-theme"
                value={opt.value}
                checked={selected}
                className="sr-only"
                onChange={() => setPreference(opt.value)}
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
