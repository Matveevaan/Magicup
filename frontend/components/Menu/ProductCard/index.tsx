//components/menu/ProductCard/index
'use client';


import { Product, formatPrice, getDefaultVariant } from '../../../lib/menuApi';
import styles from './ProductCard.module.scss';
import { useState } from 'react';
import Button from '../../ui/Button';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const [showVariants, setShowVariants] = useState(false);

  const defaultVariant = getDefaultVariant(product);
  const hasVariants = product.variants && product.variants.length > 0;
  const hasMultipleVariants = product.variants?.length > 1 || false;

  // Вспомогательные функции
  const getVolumeDisplay = () => {
    if (!defaultVariant) return '';

    if (defaultVariant.volume_name && defaultVariant.volume_value) {
      return `${defaultVariant.volume_name} (${defaultVariant.volume_value})`;
    } else if (defaultVariant.volume_value) {
      return defaultVariant.volume_value;
    }

    return '';
  };

  const getCalories = () => {
    return defaultVariant?.calories || null;
  };

  const volumeDisplay = getVolumeDisplay();
  const calories = getCalories();

  // Вычисляем минимальную цену вручную (если нет min_price в продукте)
  const minPrice = product.min_price || 0;

  // Бейджи
  const badges = [];
  if (product.is_featured) badges.push({ text: 'Рекомендуем', type: 'featured' });
  if (!product.is_available) badges.push({ text: 'Нет в наличии', type: 'unavailable' });

  return (
    <div className={styles.productCard}>
      {/* Изображение товара */}
      <div className={styles.imageContainer}>
        {product.image_url && !imageError ? (
          <div className={styles.imageWrapper}>
            <img
              src={product.image_url}
              alt={product.name}
              className={styles.productImage}
              onError={() => setImageError(true)}

            />
          </div>
        ) : (
          <div className={styles.imagePlaceholder}>
            <span>{product.name.charAt(0)}</span>
          </div>
        )}

        {/* Бейджи */}
        {badges.length > 0 && (
          <div className={styles.badges}>
            {badges.map((badge, index) => (
              <div
                key={index}
                className={`${styles.badge} ${styles[badge.type]}`}
              >
                {badge.text}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Информация о товаре */}
      <div className={styles.productInfo}>
        {/* Название */}
        <h3 className={styles.productName}>{product.name}</h3>

        {/* Краткое описание */}
        {product.short_description && (
          <p className={styles.shortDescription}>{product.short_description}</p>
        )}

        {/* Объем и калории */}
        <div className={styles.details}>
          <div className={styles.leftColumn}>
            {hasVariants && defaultVariant && (
              <>
                <div className={styles.volume}>{volumeDisplay}</div>
                {calories && (
                  <div className={styles.calories}>{calories} ккал</div>
                )}
              </>
            )}
          </div>

          {/* Цена */}
          <div className={styles.rightColumn}>
            {hasVariants ? (
              hasMultipleVariants ? (
                <div className={styles.fromPrice}>
                  <div className={styles.fromLabel}>от</div>
                  <div className={styles.price}>{formatPrice(minPrice)}</div>
                </div>
              ) : (
                <div className={styles.price}>
                  {formatPrice(defaultVariant!.price)}
                </div>
              )
            ) : (
              <div className={styles.noPrice}></div>
            )}
          </div>
        </div>

        {/* Все варианты (если больше одного) */}
        {hasMultipleVariants && (
          <div className={styles.variantsSection}>
            <Button
              className={styles.variantsToggle}
              onClick={() => setShowVariants(!showVariants)}
              aria-expanded={showVariants ? "true" : "false"}
              aria-controls={`variants-${product.id}`}
            >
              <span className={styles.variantsTitle}>
                {showVariants ? 'Скрыть варианты' : 'Все варианты'}
              </span>
              <svg
                className={`${styles.toggleIcon} ${showVariants ? styles.rotated : ''}`}
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 6L8 10L12 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>

            {/* Список вариантов с анимацией */}
            <div
              id={`variants-${product.id}`}
              className={`${styles.variantsContainer} ${showVariants ? styles.expanded : ''}`}
              data-variants-count={product.variants?.length || 0}
              role="region"
              aria-label="Варианты товара"
            >
              <div className={styles.variantsList}>
                {product.variants.map((variant) => (
                  <div key={variant.id} className={styles.variant}>
                    <span className={styles.variantName}>
                      {variant.volume_name && variant.volume_value
                        ? `${variant.volume_name} (${variant.volume_value})`
                        : variant.volume_value || '—'}
                    </span>
                    <span className={styles.variantPrice}>
                      {formatPrice(variant.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}