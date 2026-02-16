// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import styles from './home.module.scss';

// Динамические импорты для оптимизации
const Carousel = dynamic(() => import('../components/Homepage/Carousel'));
const PairImages = dynamic(() => import('../components/Homepage/PairImages'));
const MapSection = dynamic(() => import('../components/Homepage/MapSection'));
const AdditionalImages = dynamic(() => import('../components/Homepage/AdditionalImages'));

import homeApi from '../lib/homeApi';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';

export default function HomePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      const result = await homeApi.getHomeData();
      
      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError('Не удалось загрузить данные главной страницы');
      }
    } catch (err) {
      setError('Ошибка при загрузке данных');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner />
        <p>Загружаем контент главной страницы...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <ErrorMessage message={error} onRetry={loadHomeData} />
      </div>
    );
  }

  return (
    <div className={styles.homePage}>
      {/* Карусель показывается только если включена */}
      {data?.show_carousel && data?.carousel && data.carousel.length > 0 && (
        <div className={styles.carouselSection}>
          <Carousel slides={data.carousel} />
        </div>
      )}

      {/* Пара картинок показывается только если включена */}
      {data?.show_pair && data?.pair && (
        <div className={styles.pairSection}>
          <PairImages data={data.pair} />
        </div>
      )}

      {/* Карта показывается только если включена */}
      {data?.show_map && data?.map && (
        <div className={styles.mapSection}>
          <MapSection data={data.map} />
        </div>
      )}

      {/* Дополнительные картинки показываются только если включены */}
      {data?.show_gallery && data?.additional_images && data.additional_images.length > 0 && (
        <div className={styles.additionalSection}>
          <AdditionalImages images={data.additional_images} />
        </div>
      )}

      {/* Если нет контента */}
      {(!data?.show_carousel || !data?.carousel?.length) && 
       (!data?.show_pair || !data?.pair) && 
       (!data?.show_map || !data?.map) && 
       (!data?.show_gallery || !data?.additional_images?.length) && (
        <div className={styles.emptyState}>
          <p>Контент главной страницы пока не добавлен</p>
        </div>
      )}
    </div>
  );
}