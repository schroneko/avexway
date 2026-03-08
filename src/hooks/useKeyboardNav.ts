import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type KeyboardNavOptions = {
  nextChapterId?: string | null;
  previousChapterId?: string | null;
};

const indicatorStorageKey = 'keyboard-nav-indicator';

function isTypingTarget(element: Element | null) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const tagName = element.tagName.toLowerCase();

  return element.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

export function useKeyboardNav({ nextChapterId, previousChapterId }: KeyboardNavOptions) {
  const location = useLocation();
  const navigate = useNavigate();
  const [indicator, setIndicator] = useState<string | null>(null);

  useEffect(() => {
    const storedIndicator = window.sessionStorage.getItem(indicatorStorageKey);

    if (!storedIndicator) {
      return;
    }

    window.sessionStorage.removeItem(indicatorStorageKey);
    setIndicator(storedIndicator);

    const timeoutId = window.setTimeout(() => {
      setIndicator(null);
    }, 900);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [location.key]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      if (isTypingTarget(document.activeElement)) {
        return;
      }

      const key = event.key.toLowerCase();

      if ((event.key === 'ArrowRight' || key === 'l') && nextChapterId) {
        event.preventDefault();
        window.sessionStorage.setItem(indicatorStorageKey, nextChapterId);
        navigate(`/${nextChapterId}`);
      }

      if ((event.key === 'ArrowLeft' || key === 'h') && previousChapterId) {
        event.preventDefault();
        window.sessionStorage.setItem(indicatorStorageKey, previousChapterId);
        navigate(`/${previousChapterId}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, nextChapterId, previousChapterId]);

  return { indicator };
}
