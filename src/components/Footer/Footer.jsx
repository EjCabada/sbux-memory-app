import React from "react";
import styles from "./Footer.module.css";

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <p>
        This is a beta program developed by ejcabada.
        <br />
        <a
          href="https://github.com/EjCabada"
          target="_blank"
          rel="noopener noreferrer"
        >
          View Source code on GitHub
        </a>
      </p>
    </footer>
  );
};

export default Footer;