'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './carousel.module.scss';

const Carousel = ({ slides = [] }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [slides.length]);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  if (slides.length === 0) {
    return (
      <div className={styles.noSlides}>
        <p>Карусель пуста</p>
      </div>
    );
  }

  const current = slides[currentSlide];
  
  const imageSrc = isMobile && current?.image_phone 
    ? current.image_phone 
    : current?.image_pc;
  
  const isMobileImage = isMobile && current?.image_phone;

  return (
    <div className={styles.carousel}>
      {slides.length > 1 && (
        <>
          <button 
            className={`${styles.navButton} ${styles.prev}`}
            onClick={prevSlide}
            aria-label="Предыдущий слайд"
          >
            ‹
          </button>
          <button 
            className={`${styles.navButton} ${styles.next}`}
            onClick={nextSlide}
            aria-label="Следующий слайд"
          >
            ›
          </button>
        </>
      )}

      <div className={styles.slideContainer}>
        {current?.link ? (
          <Link href={current.link} className={styles.slideLink}>
            <div className={styles.imageWrapper}>
              <img
                src={imageSrc}
                alt={`Слайд ${currentSlide + 1}`}
                className={`${styles.image} ${isMobileImage ? styles.mobileImage : ''}`}
              />
            </div>
          </Link>
        ) : (
          <div className={styles.imageWrapper}>
            <img
              src={imageSrc}
              alt={`Слайд ${currentSlide + 1}`}
              className={`${styles.image} ${isMobileImage ? styles.mobileImage : ''}`}
            />
          </div>
        )}
      </div>

      {slides.length > 1 && (
        <div className={styles.dots}>
          {slides.map((_, index) => (
            <button
              key={index}
              className={`${styles.dot} ${index === currentSlide ? styles.active : ''}`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Перейти к слайду ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Carousel;