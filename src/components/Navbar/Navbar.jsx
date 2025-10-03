import React, { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./Navbar.module.css";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <nav className={styles.navbar}>
      <Link to="/" className={styles.brand} onClick={closeMenu}>
        <h2>Sbux Memory App</h2>
      </Link>

      <div className={styles.hamburger} onClick={toggleMenu}>
        <div className={isOpen ? `${styles.line} ${styles.line1open}` : styles.line}></div>
        <div className={isOpen ? `${styles.line} ${styles.line2open}` : styles.line}></div>
        <div className={isOpen ? `${styles.line} ${styles.line3open}` : styles.line}></div>
      </div>

      <div className={isOpen ? `${styles.navLinks} ${styles.open}` : styles.navLinks}>
        <Link to="/" className={styles.navLink} onClick={closeMenu}>
          Home
        </Link>
        <Link to="/search" className={styles.navLink} onClick={closeMenu}>
          Search Recipes
        </Link>
        <Link to="/resources" className={styles.navLink} onClick={closeMenu}>
          More Resources
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;