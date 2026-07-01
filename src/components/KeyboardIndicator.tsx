import { formatChapterNumber } from "../lib/chapters";

type KeyboardIndicatorProps = {
  indicator: string | null;
};

export function KeyboardIndicator({ indicator }: KeyboardIndicatorProps) {
  if (!indicator) {
    return null;
  }

  return (
    <div aria-live="polite" className="keyboard-indicator" role="status">
      第{formatChapterNumber(indicator)}章
    </div>
  );
}
