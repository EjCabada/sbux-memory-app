import React from 'react';
import styles from './Resources.module.css';

const Resources = () => {
  return (
    <div className={styles.resourcesContainer}>
      <h2>More Resources</h2>
      <p>Here are some helpful documents for further learning:</p>
      <ul className={styles.resourceList}>
        <li>
          <a href="/files/Hot Bar Infographic.pdf" target="_blank" rel="noopener noreferrer">
            Hot Bar Infographic
          </a>
        </li>
        <li>
          <a href="/files/prep.pdf" target="_blank" rel="noopener noreferrer">
            Starbucks Prep Guide
          </a>
        </li>
      </ul>
    </div>
  );
};

export default Resources;