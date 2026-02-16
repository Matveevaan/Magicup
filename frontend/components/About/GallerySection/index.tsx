// frontend/components/About/GallerySection/GallerySection.tsx
'use client';

import { Gallery } from '../../../lib/aboutApi';
import { useState, useEffect } from 'react';
import styles from './GallerySection.module.scss';

interface GallerySectionProps {
  galleries: Gallery[];
}

export default function GallerySection({ galleries }: GallerySectionProps) {
  const [selectedImage, setSelectedImage] = useState<{galleryIndex: number, imageIndex: number} | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedImage) {
        closeLightbox();
      }
      if (e.key === 'ArrowLeft' && selectedImage) {
        goToPrevious();
      }
      if (e.key === 'ArrowRight' && selectedImage) {
        goToNext();
      }
    };

    if (selectedImage) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [selectedImage]);

  if (!galleries || galleries.length === 0) {
    return null;
  }

  const openLightbox = (galleryIndex: number, imageIndex: number) => {
    setSelectedImage({ galleryIndex, imageIndex });
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const goToPrevious = () => {
    if (!selectedImage) return;
    
    const { galleryIndex, imageIndex } = selectedImage;
    const gallery = galleries[galleryIndex];
    
    if (imageIndex > 0) {
      setSelectedImage({ galleryIndex, imageIndex: imageIndex - 1 });
    } else {
      if (galleryIndex > 0) {
        const prevGallery = galleries[galleryIndex - 1];
        setSelectedImage({ 
          galleryIndex: galleryIndex - 1, 
          imageIndex: prevGallery.images.length - 1 
        });
      }
    }
  };

  const goToNext = () => {
    if (!selectedImage) return;
    
    const { galleryIndex, imageIndex } = selectedImage;
    const gallery = galleries[galleryIndex];
    
    if (imageIndex < gallery.images.length - 1) {
      setSelectedImage({ galleryIndex, imageIndex: imageIndex + 1 });
    } else {
      if (galleryIndex < galleries.length - 1) {
        setSelectedImage({ 
          galleryIndex: galleryIndex + 1, 
          imageIndex: 0 
        });
      }
    }
  };

  const getCurrentImage = () => {
    if (!selectedImage) return null;
    const { galleryIndex, imageIndex } = selectedImage;
    return galleries[galleryIndex].images[imageIndex];
  };

  const currentImage = getCurrentImage();

  return (
    <div className={styles.gallerySection}>
      <div className={styles.container}>
        {galleries.map((gallery, galleryIndex) => (
          <div key={gallery.id} className={styles.galleryContainer}>
            {gallery.show_title && gallery.title && (
              <h2 className={styles.galleryTitle}>{gallery.title}</h2>
            )}
            
            {gallery.show_description && gallery.description && (
              <p className={styles.galleryDescription}>{gallery.description}</p>
            )}
            
            {gallery.images.length > 0 && (
              <div className={styles.galleryGrid}>
                {gallery.images.map((image, imageIndex) => (
                  <div 
                    key={image.id} 
                    className={styles.galleryItem}
                    onClick={() => openLightbox(galleryIndex, imageIndex)}
                  >
                    <div className={styles.imageWrapper}>
                      <img
                        src={image.image}
                        alt={image.caption || `Изображение ${imageIndex + 1}`}
                      />
                    </div>
                    {image.show_caption && image.caption && (
                      <p className={styles.imageCaption}>{image.caption}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {selectedImage !== null && currentImage && (
        <div className={styles.lightbox} onClick={closeLightbox}>
          <button 
            className={styles.closeButton} 
            onClick={closeLightbox}
            aria-label="Закрыть"
          >
            ✕
          </button>
          
          <button 
            className={styles.navButton}
            style={{ left: '20px' }}
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
            aria-label="Предыдущее изображение"
          >
            ‹
          </button>
          
          <div 
            className={styles.lightboxContent} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.lightboxImage}>
              <img
                src={currentImage.image}
                alt={currentImage.caption || 'Изображение'}
              />
            </div>
            {currentImage.show_caption && currentImage.caption && (
              <div className={styles.lightboxCaption}>
                {currentImage.caption}
              </div>
            )}
            <div className={styles.imageCounter}>
              {selectedImage.imageIndex + 1} из {galleries[selectedImage.galleryIndex].images.length}
              {galleries.length > 1 && ` (Галерея ${selectedImage.galleryIndex + 1})`}
            </div>
          </div>
          
          <button 
            className={styles.navButton}
            style={{ right: '20px' }}
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            aria-label="Следующее изображение"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}