'use client';

import { useState, useEffect } from 'react';
import styles from './mapsection.module.scss';

const MapSection = ({ data }) => {
  const [showIframe, setShowIframe] = useState(false);
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

  const handleShowMap = () => {
    setShowIframe(true);
  };

  const previewImage = isMobile ? 
    (data.preview_image_phone || data.preview_image) : 
    data.preview_image;
  
  const isMobileImage = isMobile && data.preview_image_phone;

  return (
    <div className={styles.mapContainer}>
      <div className={styles.mapWrapper}>
        {showIframe ? (
          <div 
            className={styles.iframeContainer}
            dangerouslySetInnerHTML={{ __html: data.iframe_code }}
          />
        ) : (
          <div className={styles.previewContainer}>
            {previewImage ? (
              <>
                <div className={styles.previewImage}>
                  <img
                    src={previewImage}
                    alt="Превью карты"
                    className={`${styles.image} ${isMobileImage ? styles.mobileImage : ''}`}
                  />
                  <div className={styles.overlay} />
                </div>
                <button 
                  className={styles.showMapButton}
                  onClick={handleShowMap}
                >
                  Показать карту
                </button>
              </>
            ) : (
              <div 
                className={styles.iframeContainer}
                dangerouslySetInnerHTML={{ __html: data.iframe_code }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MapSection;