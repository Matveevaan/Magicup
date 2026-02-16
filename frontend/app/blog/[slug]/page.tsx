import { notFound } from 'next/navigation';
import Link from 'next/link';
import BlogAPI from '../../../lib/blogApi';
import styles from './postpage.module.scss';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const post = await BlogAPI.getPost(slug);
  
  if (!post) {
    return {
      title: 'Статья не найдена',
      description: 'Статья не найдена',
    };
  }
  
  return {
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt,
  };
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await BlogAPI.getPost(slug);
  
  if (!post) {
    notFound();
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getImageUrl = (imagePath?: string) => {
    if (!imagePath) return null;
    
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    if (imagePath.startsWith('/')) {
      return `http://127.0.0.1:8000${imagePath}`;
    }
    
    return `http://127.0.0.1:8000/media/${imagePath}`;
  };

  const imageUrl = getImageUrl(post.image);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/blog" className={styles.back}>
          ← Назад к статьям
        </Link>
        
        <article className={styles.article}>
          <header className={styles.header}>
            <h1 className={styles.title}>{post.title}</h1>
            
            <div className={styles.meta}>
              <time>{formatDate(post.published_date)}</time>
              <span>{post.views || 0} просмотров</span>
              {post.author_name && <span>Автор: {post.author_name}</span>}
            </div>
            
            {post.categories && post.categories.length > 0 && (
              <div className={styles.categories}>
                {post.categories.map((cat: any) => (
                  <Link 
                    key={cat.id} 
                    href={`/blog?category=${cat.slug}`}
                    className={styles.category}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}
          </header>
          
          {imageUrl && (
            <div className={styles.image}>
              <img
                src={imageUrl}
                alt={post.title}
                loading="eager"
              />
            </div>
          )}
          
          {post.excerpt && (
            <div className={styles.excerpt}>
              <p>{post.excerpt}</p>
            </div>
          )}
          
          <div 
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
          
          <footer className={styles.footer}>
            {post.categories && post.categories.length > 0 && (
              <div className={styles.tags}>
                <span>Теги: </span>
                {post.categories.map((cat: any) => (
                  <Link 
                    key={cat.id} 
                    href={`/blog?category=${cat.slug}`}
                    className={styles.tag}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}
             {/* <div className={styles.share}>
              <span>Поделиться: </span>
              <button className={styles.shareButton}>Telegram</button>
              <button className={styles.shareButton}>MAX</button>              
            </div> */}
          </footer>
        </article>
      </div>
    </div>
  );
}




            
           
         