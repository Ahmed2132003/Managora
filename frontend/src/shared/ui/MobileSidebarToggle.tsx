import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const MOBILE_BREAKPOINT = 1100;

export function MobileSidebarToggle() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const syncVisibility = () => {
      const hasSidebar = Boolean(document.querySelector(".dashboard-shell .dashboard-sidebar"));
      setIsVisible(window.innerWidth <= MOBILE_BREAKPOINT && hasSidebar);

      if (window.innerWidth > MOBILE_BREAKPOINT || !hasSidebar) {
        setIsOpen(false);
      }
    };

    syncVisibility();

    const observer = new MutationObserver(syncVisibility);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", syncVisibility);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncVisibility);
    };
  }, [location.pathname]);

  useEffect(() => {
    document.body.classList.toggle("mobile-sidebar-open", isOpen);
    return () => document.body.classList.remove("mobile-sidebar-open");
  }, [isOpen]);


  if (!isVisible) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="mobile-sidebar-toggle"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span />
        <span />
        <span />
      </button>
      <button
        type="button"
        className="mobile-sidebar-backdrop"
        aria-label="Close navigation menu"
        onClick={() => setIsOpen(false)}
      />
    </>
  );
}