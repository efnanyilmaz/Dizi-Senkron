export function FormField({
  label,
  type = "text",
  name,
  autoComplete,
  placeholder,
  minLength,
}: {
  label: string;
  type?: string;
  name: string;
  autoComplete?: string;
  placeholder?: string;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-xs tracking-[0.08em] text-ink-soft uppercase">
        {label}
      </span>
      <input
        type={type}
        name={name}
        autoComplete={autoComplete}
        placeholder={placeholder}
        minLength={minLength}
        required
        className="w-full border-b-2 border-guide-edge bg-transparent pb-2.5 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-soft/50 focus:border-ink"
      />
    </label>
  );
}
