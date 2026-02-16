// frontend/app/blog/page.tsx
import BlogSidebar from '../../components/Blog/BlogSidebar';
import BlogCard from '../../components/Blog/BlogCard';
import BlogAPI from '../../lib/blogApi';
import styles from './BlogPage.module.scss';

interface PageProps {
  searchParams?: Promise<{
    category?: string;
    page?: string;
    [key: string]: string | string[] | undefined;
  }>;
}

export const metadata = {
  title: 'Блог | Кофейня Малжикап',
  description: 'Статьи о кофе и новости кофейни',
};

export default async function BlogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const category = params?.category || '';
  const page = parseInt(params?.page || '1', 10);
  
  let postsData = { results: [], count: 0 };
  let categories = [];
  
  try {
    const [posts, cats] = await Promise.all([
      BlogAPI.getPosts(page, category as string),
      BlogAPI.getCategories()
    ]);
    
    postsData = posts;
    categories = cats;
    
  } catch (error) {
    console.error('Ошибка загрузки данных блога:', error);
    return (
      <div className={styles.errorContainer}>
        <h1>Ошибка загрузки</h1>
        <p>Пожалуйста, попробуйте позже</p>
      </div>
    );
  }

  if (!category && postsData.results.length === 0) {
    return (
      <div className={styles.inactiveContainer}>
        <h1>Блог в разработке</h1>
        <p>Статьи скоро появятся</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Блог</h1>
          <p className={styles.subtitle}>Новости, статьи и истории о кофе</p>
        </header>

        <div className={styles.content}>
          <main className={styles.main}>
            {/* Категории на мобилке (сверху над постами) */}
            <div className={styles.mobileCategories}>
              <BlogSidebar 
                categories={categories}
                showCategories={true}
                showSubscribe={false}
              />
            </div>
            
            <div className={styles.filters}>
              <div className={styles.stats}>
                <p>Найдено статей: {postsData.count}</p>
              </div>
              
              {category && (
                <div className={styles.categoryBadge}>
                  <span>Категория: </span>
                  <strong>
                    {categories.find(c => c.slug === category)?.name || category}
                  </strong>
                  <a href="/blog" className={styles.clearFilter}>
                    × Очистить
                  </a>
                </div>
              )}
            </div>
            
            {/* Список постов */}
            {postsData.results.length > 0 ? (
              <div className={styles.postsList}>
                {postsData.results.map((post) => (
                  <BlogCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                {category ? (
                  <>
                    <p>В категории "{categories.find(c => c.slug === category)?.name || category}" пока нет статей.</p>
                    <a href="/blog" className={styles.backLink}>
                      ← Вернуться ко всем статьям
                    </a>
                  </>
                ) : (
                  <p>Статей пока нет. Зайдите позже!</p>
                )}
              </div>
            )}
            
            {/* Подписка на мобилке (после постов) */}
            <div className={styles.mobileOther}>
              <BlogSidebar 
                categories={categories}
                showCategories={false}
                showSubscribe={true}
              />
            </div>
          </main>
          
          {/* Боковая панель на десктопе и планшете (справа) */}
          <aside className={styles.desktopSidebar}>
            <BlogSidebar 
              categories={categories}
              showCategories={true}
              showSubscribe={true}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}