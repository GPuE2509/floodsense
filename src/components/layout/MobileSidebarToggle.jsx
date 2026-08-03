import React, { useState, useEffect } from 'react';

/**
 * MobileSidebarToggle
 * ──────────────────────────────────────────────────────────────
 * Self-contained mobile hamburger + overlay.
 * - Adds/removes `.mobile-sidebar-open` on <body>
 * - Sidebar CSS uses `.mobile-sidebar-open .sidebar { transform: translateX(0) }`
 * - No prop drilling into individual Sidebar/TopBar components needed.
 * ──────────────────────────────────────────────────────────────
 */
export default function MobileSidebarToggle() {
  const [open, setOpen] = useState(false);

  const toggle = () => setOpen(p => !p);
  const close = () => setOpen(false);

  // Sync body class
  useEffect(() => {
    if (open) {
      document.body.classList.add('mobile-sidebar-open');
    } else {
      document.body.classList.remove('mobile-sidebar-open');
    }
    return () => document.body.classList.remove('mobile-sidebar-open');
  }, [open]);

  // Close when clicking a nav-item or collapse-btn inside the sidebar
  useEffect(() => {
    const handleNavClick = (e) => {
      if (e.target.closest('.nav-item') || e.target.closest('.collapse-btn')) {
        close();
      }
    };
    document.addEventListener('click', handleNavClick);
    return () => document.removeEventListener('click', handleNavClick);
  }, []);

  return (
    <>
      {/* Hamburger button — fixed position, visible only on mobile via CSS */}
      <button
        className={`mobile-hamburger-btn ${open ? 'is-open' : ''}`}
        onClick={toggle}
        aria-label={open ? 'Close menu' : 'Open menu'}
        title={open ? 'Close menu' : 'Open menu'}
      >
        <span />
        <span />
        <span />
      </button>

      {/* Dark overlay — closes sidebar when tapped */}
      {open && (
        <div
          className="mobile-sidebar-overlay"
          onClick={close}
          aria-hidden="true"
        />
      )}
    </>
  );
}
