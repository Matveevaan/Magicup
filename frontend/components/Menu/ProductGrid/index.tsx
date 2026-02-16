// frontend/components/Menu/ProductGrid/ProductGrid.tsx
import { Product, ProductGroup } from '../../../lib/menuApi';
import ProductCard from '../ProductCard';
import styles from './ProductGrid.module.scss';

interface ProductGridProps {
  products: Product[];
  groups?: ProductGroup[]; // Группы для заголовков
  title?: string;
  emptyMessage?: string;
}

export default function ProductGrid({ 
  products, 
  groups, 
  title, 
  emptyMessage 
}: ProductGridProps) {
  
  if (!products || products.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>☕</div>
        <h3 className={styles.emptyTitle}>
          {emptyMessage || 'Товары не найдены'}
        </h3>
        <p className={styles.emptyText}>
          В этой категории пока нет товаров
        </p>
      </div>
    );
  }

  // Если переданы группы и есть товары - группируем по группам
  if (groups && groups.length > 0) {
    // Фильтруем только те группы, у которых есть товары
    const groupsWithProducts = groups
      .map(group => ({
        ...group,
        products: products.filter(product => product.group === group.id)
      }))
      .filter(group => group.products.length > 0)
      .sort((a, b) => a.display_order - b.display_order);

    if (groupsWithProducts.length > 0) {
      return (
        <div className={styles.productGrid}>
          {title && <h2 className={styles.gridTitle}>{title}</h2>}
          
          {groupsWithProducts.map((group) => (
            <div key={group.id} className={styles.groupSection}>
              {/* Заголовок группы */}
              <h3 className={styles.groupTitle}>{group.name}</h3>
              
              {/* Описание группы (если есть) */}
              {group.description && (
                <p className={styles.groupDescription}>{group.description}</p>
              )}
              
              {/* Сетка товаров этой группы */}
              <div className={styles.grid}>
                {group.products.map((product) => (
                  <div key={product.id} className={styles.gridItem}>
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }
  }

  // Если групп нет или они пустые - показываем обычную сетку
  return (
    <div className={styles.productGrid}>
      {title && <h2 className={styles.gridTitle}>{title}</h2>}
      
      <div className={styles.grid}>
        {products.map((product) => (
          <div key={product.id} className={styles.gridItem}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
}