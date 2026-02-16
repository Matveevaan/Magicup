// app/menu/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductGrid from '../../components/Menu/ProductGrid';
import { menuApi, Product, ProductGroup } from '../../lib/menuApi'; 
import styles from './menu.module.scss';

function MenuContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<ProductGroup[]>([]); 
  const [filteredGroups, setFilteredGroups] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const menuType = searchParams?.get('menu_type') || '';

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        console.log('[MenuPage] Загрузка данных...', { menuType });
        
        let productsData: Product[] = [];
        let groupsData: ProductGroup[] = []; 
        
        // Загружаем продукты с фильтром по menu_type если указан
        productsData = await menuApi.getProducts({
          menu_type: menuType || undefined
        });
        
        // Загружаем все группы
        groupsData = await menuApi.getGroups();
        
        // Фильтруем группы по типу меню, если указан
        if (menuType) {
          groupsData = groupsData.filter(group => group.menu_type === menuType);
        }
        
        setProducts(productsData);
        setGroups(groupsData);
        console.log(`[MenuPage] Загружено: ${productsData.length} продуктов, ${groupsData.length} групп`);
        
      } catch (error) {
        console.error('[MenuPage] Ошибка загрузки меню:', error);
        setError('Не удалось загрузить меню. Пожалуйста, обновите страницу.');
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [menuType]);

  // Обновляем title страницы
  useEffect(() => {
    let pageTitle = 'Меню';
    
    if (menuType) {
      // Определяем название типа меню
      const menuTypeNames: Record<string, string> = {
        drinks: 'Напитки',
        desserts: 'Десерты',
        sandwiches: 'Сэндвичи и выпечка'
      };
      pageTitle = menuTypeNames[menuType] || 'Меню';
    }
    
    document.title = `${pageTitle} | Кофейня Малжикап`;
  }, [menuType]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loadingContainer}>
            <h1>Загрузка меню...</h1>
            <p>Пожалуйста, подождите</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorContainer}>
            <h1>Ошибка загрузки</h1>
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className={styles.retryButton}
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.inactiveContainer}>
            <h1>Меню временно недоступно</h1>
            <p>Пожалуйста, попробуйте позже или свяжитесь с нами</p>
          </div>
        </div>
      </div>
    );
  }

  // Определяем заголовок страницы
  const menuTypeNames: Record<string, string> = {
    drinks: 'Напитки',
    desserts: 'Десерты',
    sandwiches: 'Сэндвичи и выпечка'
  };
  
  const pageTitle = menuType ? menuTypeNames[menuType] : 'Меню';
  const subtitle = menuType ? '' : 'Вкусные напитки и закуски на любой вкус';

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* <header className={styles.header}>
          <h1 className={styles.title}>{pageTitle}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </header> */}

        {/* Фильтр по типам меню сверху */}
        <div className={styles.filters}>
          <div className={styles.filterBadges}>
            <a 
              href="/menu" 
              className={`${styles.filterBadge} ${!menuType ? styles.active : ''}`}
            >
              Все товары
            </a>
            
            <a
              href="/menu?menu_type=drinks"
              className={`${styles.filterBadge} ${menuType === 'drinks' ? styles.active : ''}`}
            >
              Напитки
            </a>
            <a
              href="/menu?menu_type=desserts"
              className={`${styles.filterBadge} ${menuType === 'desserts' ? styles.active : ''}`}
            >
              Десерты
            </a>
            <a
              href="/menu?menu_type=sandwiches"
              className={`${styles.filterBadge} ${menuType === 'sandwiches' ? styles.active : ''}`}
            >
              Сэндвичи и выпечка
            </a>
          </div>
        </div>

        {/* Список товаров с группировкой по группам */}
        <ProductGrid 
          products={products}
          groups={groups} // Передаем группы для заголовков
          title={pageTitle}
          emptyMessage={menuType ? `В разделе "${pageTitle}" пока нет товаров` : undefined}
        />
      </div>
    </div>
  );
}

// Основной компонент с Suspense
export default function MenuPage() {
  return (
    <Suspense fallback={
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loadingContainer}>
            <h1>Загрузка...</h1>
          </div>
        </div>
      </div>
    }>
      <MenuContent />
    </Suspense>
  );
}