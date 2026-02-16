// components/Blog/BlogSidebar/index.tsx
'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import styles from './blogsidebar.module.scss';
import { useState, useEffect } from 'react';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface BlogSidebarProps {
  categories: Category[];
  showCategories?: boolean;
  showSubscribe?: boolean;
}

export default function BlogSidebar({ 
  categories, 
  showCategories = true,
  showSubscribe = true
}: BlogSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  useEffect(() => {
    const category = searchParams?.get('category') || '';
    setSelectedCategory(category);
  }, [searchParams]);
  
  const createCategoryUrl = (categorySlug: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    
    if (categorySlug) {
      params.set('category', categorySlug);
      params.delete('page');
    } else {
      params.delete('category');
      params.delete('page');
    }
    
    const queryString = params.toString();
    return `${pathname}${queryString ? `?${queryString}` : ''}`;
  };
  
  if (!showCategories && !showSubscribe) {
    return null;
  }
  
  return (
    <div className={styles.sidebar}>
      {showCategories && (
        <div className={styles.widget}>
          <h3>Категории</h3>
          {categories.length === 0 ? (
            <p className={styles.noCategories}>Категории пока не добавлены</p>
          ) : (
            <ul className={styles.list}>
              <li className={!selectedCategory ? styles.active : ''}>
                <Link 
                  href={createCategoryUrl('')}
                  onClick={() => setSelectedCategory('')}
                >
                  Все статьи
                </Link>
              </li>
              
              {categories.map((cat) => (
                <li 
                  key={cat.id} 
                  className={selectedCategory === cat.slug ? styles.active : ''}
                >
                  <Link 
                    href={createCategoryUrl(cat.slug)}
                    onClick={() => setSelectedCategory(cat.slug)}
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      
      {showSubscribe && (
        <div className={styles.widget}>
          <h3>Подписка</h3>
          <p>Получайте новые статьи на почту</p>
          <form className={styles.subscribeForm}>
            <input 
              type="email" 
              placeholder="Ваш email"
              className={styles.emailInput}
            />
            <button type="submit" className={styles.subscribeButton}>
              Подписаться
            </button>
          </form>
        </div>
      )}
    </div>
  );
}