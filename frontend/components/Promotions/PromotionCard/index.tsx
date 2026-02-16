// components/Promotions/PromotionCard/index.tsx (обновленный)
import React from 'react';
import styles from './promotioncard.module.scss';

interface PromotionCardProps {
  promotion: {
    id: number;
    title: string;
    slug: string;
    image: string;
    description: string;
    short_description: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
    is_featured: boolean;
  };
}

export default function PromotionCard({ promotion }: PromotionCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return null;
    
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    if (imagePath.startsWith('/')) {
      return `http://127.0.0.1:8000${imagePath}`;
    }
    
    return `http://127.0.0.1:8000/media/${imagePath}`;
  };

  // Обрезаем заголовок до 2 строк
  const getTruncatedTitle = () => {
    const maxLength = 70; // Примерная длина для 2 строк
    if (promotion.title.length <= maxLength) return promotion.title;
    
    const truncated = promotion.title.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > 0 
      ? truncated.substring(0, lastSpace) + '...' 
      : truncated + '...';
  };

  // Обрезаем описание до 4 строк
  const getTruncatedDescription = () => {
    if (promotion.short_description && promotion.short_description.trim()) {
      const maxLength = 150; // Примерная длина для 4 строк
      if (promotion.short_description.length <= maxLength) {
        return promotion.short_description;
      }
      
      const truncated = promotion.short_description.substring(0, maxLength);
      const lastSpace = truncated.lastIndexOf(' ');
      
      return lastSpace > 0 
        ? truncated.substring(0, lastSpace) + '...' 
        : truncated + '...';
    }
    
    // Если short_description нет, обрезаем description
    const plainText = promotion.description
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const maxLength = 150;
    if (plainText.length <= maxLength) return plainText;
    
    const truncated = plainText.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > 0 
      ? truncated.substring(0, lastSpace) + '...' 
      : truncated + '...';
  };

  const imageUrl = getImageUrl(promotion.image);
  const isActive = promotion.is_current;
  const titleText = getTruncatedTitle();
  const descriptionText = getTruncatedDescription();

  return (
    <div className={styles.card}>
      {promotion.is_featured && (
        <div className={styles.featuredBadge}>Популярная</div>
      )}
      
      {!isActive && (
        <div className={styles.inactiveBadge}>Завершена</div>
      )}
      
      <div className={styles.image}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={promotion.title}
            loading="lazy"
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <span>{promotion.title.charAt(0)}</span>
          </div>
        )}
      </div>
      
      <div className={styles.content}>
        <div className={styles.topContent}>
          <h3 className={styles.title} title={promotion.title}>
            {titleText}
          </h3>
          
          {descriptionText && (
            <p className={styles.description} title={promotion.short_description || promotion.description}>
              {descriptionText}
            </p>
          )}
        </div>
        
        <div className={styles.bottomContent}>
          <div className={styles.dates}>
            <div className={styles.dateItem}>
              <span className={styles.dateLabel}>Начало:</span>
              <span className={styles.dateValue}>{formatDate(promotion.start_date)}</span>
            </div>
            <div className={styles.dateItem}>
              <span className={styles.dateLabel}>Окончание:</span>
              <span className={styles.dateValue}>{formatDate(promotion.end_date)}</span>
            </div>
          </div>
          
          <div className={styles.status}>
            <span className={`${styles.statusBadge} ${isActive ? styles.active : styles.inactive}`}>
              {isActive ? 'Активна сейчас' : 'Завершена'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}