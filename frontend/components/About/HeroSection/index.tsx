// frontend/components/About/HeroSection/HeroSection.tsx
'use client';

import styles from './HeroSection.module.scss';

interface HeroSectionProps {
  title: string;
  mainImage: string | null;
  showMainImage: boolean;
  mainText: string;
  showMainText: boolean;
}

export default function HeroSection({ 
  title, 
  mainImage, 
  showMainImage, 
  mainText, 
  showMainText 
}: HeroSectionProps) {
  
  const hasImage = showMainImage && mainImage;
  const hasText = showMainText && mainText;
  
  if (!hasImage && !hasText) {
    return (
      <section className={styles.heroSection}>
        <div className={styles.container}>
          <h1 className={styles.pageTitle}>{title}</h1>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.heroSection}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>{title}</h1>
        
        <div className={styles.content}>
          {hasImage && (
            <div className={styles.mainImage}>
              <img
                src={mainImage!}
                alt={title}
              />
            </div>
          )}
          
          {hasText && (
            <div 
              className={styles.mainText}
              dangerouslySetInnerHTML={{ __html: mainText }}
            />
          )}
        </div>
      </div>
    </section>
  );
}