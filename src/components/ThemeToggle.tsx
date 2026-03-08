import { useTheme } from '../hooks/useTheme';

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え';

  return (
    <button
      aria-label={label}
      className={`theme-toggle ${className}`.trim()}
      onClick={toggleTheme}
      title={label}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="theme-toggle-icon"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        viewBox="0 0 18 18"
      >
        {theme === 'dark' ? (
          <>
            <circle cx="9" cy="9" r="4" />
            <line x1="9" x2="9" y1="1.5" y2="3.5" />
            <line x1="9" x2="9" y1="14.5" y2="16.5" />
            <line x1="1.5" x2="3.5" y1="9" y2="9" />
            <line x1="14.5" x2="16.5" y1="9" y2="9" />
            <line x1="3.7" x2="5.1" y1="3.7" y2="5.1" />
            <line x1="12.9" x2="14.3" y1="12.9" y2="14.3" />
            <line x1="12.9" x2="14.3" y1="5.1" y2="3.7" />
            <line x1="3.7" x2="5.1" y1="14.3" y2="12.9" />
          </>
        ) : (
          <path
            d="M11.5 2.5a6.5 6.5 0 1 0 0 13a5.5 5.5 0 1 1 0-13Z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
  );
}
