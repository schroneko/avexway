import { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { chapters, siteTitle } from '../lib/chapters';
import { ThemeToggle } from './ThemeToggle';

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

function formatChapterNumber(id: string) {
  return String(Number(id));
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const listRef = useRef<HTMLOListElement>(null);
  const activeChapterId = location.pathname === "/" ? "0000" : chapters.find((chapter) => location.pathname === `/${chapter.id}`)?.id ?? null;

  useEffect(() => {
    if (!activeChapterId) {
      return;
    }

    const activeLink = listRef.current?.querySelector<HTMLElement>(`[data-chapter-id="${activeChapterId}"]`);

    activeLink?.scrollIntoView({
      block: 'center',
      inline: 'nearest',
    });
  }, [activeChapterId, isOpen]);

  return (
    <aside className={`sidebar${isOpen ? ' is-open' : ''}`} aria-label="章ナビゲーション">
      <div className="sidebar-header">
        <Link aria-label={siteTitle} className="sidebar-brand" onClick={onClose} to="/">
          avex way
        </Link>
      </div>
      <nav className="sidebar-nav">
        <ol className="sidebar-chapter-list" ref={listRef}>
          <li>
            <NavLink
              className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
              data-chapter-id="0000"
              end
              onClick={onClose}
              to="/"
            >
              <span className="sidebar-link-index">0</span>
              <span className="sidebar-link-title">{siteTitle}</span>
            </NavLink>
          </li>
          {chapters.map((chapter) => (
            <li key={chapter.id}>
              <NavLink
                className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
                data-chapter-id={chapter.id}
                onClick={onClose}
                to={`/${chapter.id}`}
              >
                <span className="sidebar-link-index">{formatChapterNumber(chapter.id)}</span>
                <span className="sidebar-link-title">{chapter.title}</span>
              </NavLink>
            </li>
          ))}
        </ol>
      </nav>
      <div className="sidebar-footer">
        <ThemeToggle />
      </div>
    </aside>
  );
}
