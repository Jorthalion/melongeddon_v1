import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Modal frame for story cards, pick cards, the back room, end cards and the pause menu.
 * On open it moves focus to the element marked `data-autofocus` (else the first button),
 * keeps Tab inside, and gives focus back to whatever had it when it closes.
 * Remount it (change `key`) to treat a new card as a new dialog.
 */
export function Dialog({
  labelledBy,
  className,
  children,
}: {
  labelledBy: string;
  className?: string;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const el = box.current;
    if (el) {
      const first = el.querySelector<HTMLElement>("[data-autofocus]") ?? el.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? el).focus({ preventScroll: true });
    }
    return () => {
      if (before && before.isConnected && before !== document.body) before.focus({ preventScroll: true });
    };
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Tab" || !box.current) return;
    const items = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    } else if (!box.current.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div ref={box} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1} className={className} onKeyDown={onKeyDown}>
      {children}
    </div>
  );
}
