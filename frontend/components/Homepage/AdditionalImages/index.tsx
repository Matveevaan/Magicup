'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './additionalimages.module.scss';

const AdditionalImages = ({ images = [] }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // ВАЖНО: меняем на 480px
      setIsMobile(window.innerWidth <= 480);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (images.length === 0) return null;

  return (
    <div className={styles.galleryContainer}>
      <div className={styles.galleryGrid}>
        {images.map((item, index) => {
          // Меняем фото только на 480px и меньше
          const imageSrc = isMobile && item.image_phone 
            ? item.image_phone 
            : item.image;
          
          // Добавляем класс только если показываем мобильное фото
          const isMobileImage = isMobile && item.image_phone;
          
          return (
            <div key={item.id} className={styles.galleryItem}>
              {item.link ? (
                <Link href={item.link} className={styles.imageLink}>
                  <img
                    src={imageSrc}
                    alt={`Дополнительное изображение ${index + 1}`}
                    className={`${styles.image} ${isMobileImage ? styles.mobileImage : ''}`}
                  />
                </Link>
              ) : (
                <div className={styles.imageWrapper}>
                  <img
                    src={imageSrc}
                    alt={`Дополнительное изображение ${index + 1}`}
                    className={`${styles.image} ${isMobileImage ? styles.mobileImage : ''}`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdditionalImages;