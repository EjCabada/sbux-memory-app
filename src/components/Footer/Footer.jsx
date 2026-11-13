import React from "react";
import { Link } from "react-router-dom";
import styles from "./Footer.module.css";

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <p className={styles.credit}>Developed by ejcabada</p>
      <div className={styles.linksRow}>
        <a
          href="https://github.com/EjCabada/sbux-memory-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <span className={styles.divider}>&middot;</span>
        <Link to="/manager" className={styles.studioLink}>
          Catalog Studio
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
