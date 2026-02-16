// app/promotions/page.tsx
import PromotionCard from '../../components/Promotions/PromotionCard';
import PromotionsAPI from '../../lib/promotionsApi';
import styles from './promotions.module.scss';

export const metadata = {
  title: 'Акции | Кофейня Малжикап',
  description: 'Специальные предложения и акции кофейни',
};

export default async function PromotionsPage() {
  let currentPromotions = [];
  let pastPromotions = [];
  
  try {
    // Получаем все активные акции
    const promotionsData = await PromotionsAPI.getPromotions();
    
    // Получаем завершенные акции
    const allPromotionsData = await PromotionsAPI.getPromotions(true);
    
    currentPromotions = promotionsData.results;
    pastPromotions = allPromotionsData.results.filter(
      (promo: any) => !promo.is_current
    );
    
  } catch (error) {
    console.error('Ошибка загрузки данных акций:', error);
    return (
      <div className={styles.errorContainer}>
        <h1>Ошибка загрузки</h1>
        <p>Пожалуйста, попробуйте позже</p>
      </div>
    );
  }

  // Если нет акций
  if (currentPromotions.length === 0 && pastPromotions.length === 0) {
    return (
      <div className={styles.inactiveContainer}>
        <h1>Акции в разработке</h1>
        <p>Специальные предложения скоро появятся</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Акции</h1>
          <p className={styles.subtitle}>
            Специальные предложения и скидки для наших гостей
          </p>
        </header>

        {/* Если нет текущих акций, показываем сообщение */}
        {currentPromotions.length === 0 && pastPromotions.length > 0 && (
          <div className={styles.empty}>
            <p>На данный момент активных акций нет.</p>
            <p>Следите за обновлениями!</p>
          </div>
        )}

        {/* Текущие акции */}
        {currentPromotions.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Текущие акции</h2>
            <div className={styles.grid}>
              {currentPromotions.map((promotion: any) => (
                <PromotionCard 
                  key={promotion.id} 
                  promotion={promotion} 
                />
              ))}
            </div>
          </section>
        )}

        {/* Завершенные акции (если есть) */}
        {pastPromotions.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Завершенные акции</h2>
            <div className={styles.grid}>
              {pastPromotions.map((promotion: any) => (
                <PromotionCard 
                  key={promotion.id} 
                  promotion={promotion} 
                />
              ))}
            </div>
          </section>
        )}

        {/* Информация об акциях */}
        <div className={styles.info}>
          <h3>Как работают наши акции?</h3>
          <ul>
            <li>Все акции действуют в указанный период</li>
            <li>Скидки применяются автоматически при заказе</li>
            <li>Акции не суммируются между собой</li>
            <li>Подробности уточняйте у бариста</li>
          </ul>
        </div>
      </div>
    </div>
  );
}