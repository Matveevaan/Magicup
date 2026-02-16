// frontend/app/about/page.tsx
'use client';

import { useState, useEffect } from 'react';
import HeroSection from '../../components/About/HeroSection';
import GallerySection from '../../components/About/GallerySection';
import { getAboutData, AboutPageData } from '../../lib/aboutApi';
import styles from './about.module.scss';

export default function AboutPage() {
  const [data, setData] = useState<AboutPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const aboutData = await getAboutData();
        setData(aboutData);
      } catch (err) {
        console.error('Failed to load about page data:', err);
        setError('Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <h1>Загрузка...</h1>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.errorContainer}>
        <h1>Ошибка загрузки</h1>
        <p>{error || 'Не удалось загрузить данные'}</p>
      </div>
    );
  }

  const hasContent = 
    (data.show_main_image && data.main_image) || 
    (data.show_main_text && data.main_text) || 
    data.galleries.length > 0;

  if (!hasContent) {
    return (
      <div className={styles.inactiveContainer}>
        <h1>Страница в разработке</h1>
        <p>Загляните позже</p>
      </div>
    );
  }

  return (
    <div className={styles.aboutPage}>
      <HeroSection 
        title={data.title}
        mainImage={data.main_image}
        showMainImage={data.show_main_image}
        mainText={data.main_text}
        showMainText={data.show_main_text}
      />
      
      {data.galleries.length > 0 && (
        <GallerySection galleries={data.galleries} />
      )}
    </div>
  );
}