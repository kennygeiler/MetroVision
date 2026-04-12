/**
 * Shot detail page: Space normally scrolls the document. We suppress that for
 * timeline / Space+S workflows, but must not steal Space from real controls.
 */
export function spaceTargetKeepsNativeBehavior(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target.closest(".video-js")) {
    return true;
  }

  const host = target.closest(
    [
      "a[href]",
      "button",
      "label",
      "input",
      "select",
      "textarea",
      "summary",
      "video",
      "[contenteditable]",
      '[role="button"]',
      '[role="link"]',
      '[role="checkbox"]',
      '[role="switch"]',
      '[role="menuitem"]',
      '[role="menuitemcheckbox"]',
      '[role="menuitemradio"]',
      '[role="tab"]',
      '[role="option"]',
    ].join(","),
  );

  return host != null;
}
