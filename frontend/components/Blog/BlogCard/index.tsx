// components/Blog/blogCard/index.tsx
import Link from 'next/link';
import styles from './blogcard.module.scss';

interface BlogCardProps {
  post: {
    id: number;
    title: string;
    slug: string;
    excerpt: string;
    image?: string;
    published_date: string;
    views: number;
    categories: Array<{
      id: number;
      name: string;
      slug: string;
    }>;
  };
}

export default function BlogCard({ post }: BlogCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getImageUrl = () => {
    if (!post.image) return null;
    
    if (post.image.startsWith('http://') || post.image.startsWith('https://')) {
      return post.image;
    }
    
    if (post.image.startsWith('/')) {
      return `http://127.0.0.1:8000${post.image}`;
    }
    
    return `http://127.0.0.1:8000/media/${post.image}`;
  };

  const imageUrl = getImageUrl();
  
  // Если нет excerpt, создаем из заголовка
  const displayExcerpt = post.excerpt || `${post.title.substring(0, 100)}...`;

  return (
    <article className={styles.card}>
      {imageUrl && (
        <div className={styles.image}>
          <Link href={`/blog/${post.slug}`}>
            <img
              src={imageUrl}
              alt={post.title}
              style={{ 
                objectFit: 'cover',
                width: '100%',
                height: '100%'
              }}
              loading="lazy"
            />
          </Link>
        </div>
      )}
      
      <div className={styles.content}>
        {post.categories && post.categories.length > 0 ? (
          <div className={styles.categories}>
            {post.categories.slice(0, 2).map((cat) => ( // Ограничиваем до 2 категорий
              <Link 
                key={cat.id} 
                href={`/blog?category=${cat.slug}`}
                className={styles.category}
              >
                {cat.name}
              </Link>
            ))}
            {post.categories.length > 2 && (
              <span className={styles.category}>+{post.categories.length - 2}</span>
            )}
          </div>
        ) : (
          <div className={styles.categories}>
            <span className={styles.category}>Без категории</span>
          </div>
        )}
        
        <h3 className={styles.title}>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>
        
        <p className={styles.excerpt}>{displayExcerpt}</p>
        
        <div className={styles.meta}>
          <time>{formatDate(post.published_date)}</time>
          <span>👁️ {post.views || 0}</span>
        </div>
        
        <Link href={`/blog/${post.slug}`} className={styles.readMore}>
          Читать дальше
        </Link>
      </div>
    </article>
  );
}