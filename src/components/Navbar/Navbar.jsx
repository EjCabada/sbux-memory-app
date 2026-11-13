import React, { useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import styles from "./Navbar.module.css";

const NAV_ITEMS = [
  { to: "/", label: "Train", match: (p) => p === "/" || p.startsWith("/quiz") },
  { to: "/search", label: "Recipes", match: (p) => p.startsWith("/search") },
  { to: "/resources", label: "Resources", match: (p) => p.startsWith("/resources") },
];

const Navbar = () => {
  const { pathname } = useLocation();
  const activeIndex = NAV_ITEMS.findIndex((item) => item.match(pathname));
  const linksContainerRef = useRef(null);
  const linkRefs = useRef([]);
  const [gliderStyle, setGliderStyle] = useState({ opacity: 0, width: 0, left: 0 });

  useLayoutEffect(() => {
    const updateGlider = () => {
      if (activeIndex < 0) {
        setGliderStyle((prev) => ({ ...prev, opacity: 0 }));
        return;
      }
      const activeEl = linkRefs.current[activeIndex];
      if (!activeEl) return;
      setGliderStyle({
        opacity: 1,
        width: activeEl.offsetWidth,
        left: activeEl.offsetLeft,
      });
    };

    updateGlider();
    window.addEventListener("resize", updateGlider);
    return () => window.removeEventListener("resize", updateGlider);
  }, [activeIndex, pathname]);

  return (
    <>
      <nav className={styles.topNavbar}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandDot} />
          <span>Barista Deck</span>
        </Link>
        <div className={styles.desktopLinks} ref={linksContainerRef}>
          <span
            className={styles.desktopGlider}
            style={{
              opacity: gliderStyle.opacity,
              width: `${gliderStyle.width}px`,
              transform: `translateX(${gliderStyle.left}px)`,
            }}
            aria-hidden="true"
          />
          {NAV_ITEMS.map((item, idx) => {
            const active = idx === activeIndex;
            return (
              <Link
                key={item.to}
                ref={(el) => {
                  linkRefs.current[idx] = el;
                }}
                to={item.to}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <nav className={styles.mobileBottomBar} aria-label="Mobile Navigation">
        {activeIndex >= 0 && (
          <span
            className={styles.mobileTopGlider}
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
            aria-hidden="true"
          />
        )}
        {NAV_ITEMS.map((item, idx) => {
          const active = idx === activeIndex;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`${styles.mobileTab} ${active ? styles.mobileTabActive : ""}`}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
};

export default Navbar;
