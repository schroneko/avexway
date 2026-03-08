import { Link } from 'react-router-dom';
import { siteTitle } from '../lib/chapters';
import { ThemeToggle } from './ThemeToggle';

type TopBarProps = {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
};

export function TopBar({ isSidebarOpen, onToggleSidebar }: TopBarProps) {
  return (
    <header className="top-bar">
      <button
        aria-expanded={isSidebarOpen}
        aria-label={isSidebarOpen ? '章一覧を閉じる' : '章一覧を開く'}
        className="top-bar-button"
        onClick={onToggleSidebar}
        type="button"
      >
        <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
          <path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
        </svg>
      </button>
      <Link className="top-bar-title" to="/">
        {siteTitle}
      </Link>
      <ThemeToggle className="top-bar-theme-toggle" />
    </header>
  );
}
