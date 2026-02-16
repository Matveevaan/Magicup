'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './pairimages.module.scss';

const PairImages = ({ data }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!data) return null;

  return (
    <div className={styles.pairContainer}>
      <div className={`${styles.imageWrapper} ${isMobile ? styles.mobile : ''}`}>
        {/* Первая картинка */}
        <div className={styles.imageItem}>
          {data.link1 ? (
            <Link href={data.link1} className={styles.imageLink}>
              <img
                src={data.image1}
                alt="Первая картинка пары"
                className={styles.image}
              />
            </Link>
          ) : (
            <div className={styles.imagePlaceholder}>
              <img
                src={data.image1}
                alt="Первая картинка пары"
                className={styles.image}
              />
            </div>
          )}
        </div>

        {/* Вторая картинка */}
        <div className={styles.imageItem}>
          {data.link2 ? (
            <Link href={data.link2} className={styles.imageLink}>
              <img
                src={data.image2}
                alt="Вторая картинка пары"
                className={styles.image}
              />
            </Link>
          ) : (
            <div className={styles.imagePlaceholder}>
              <img
                src={data.image2}
                alt="Вторая картинка пары"
                className={styles.image}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PairImages;