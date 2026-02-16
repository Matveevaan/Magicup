// frontend/components/Menu/Loading/Loading.tsx
import styles from './Loading.module.scss';

interface LoadingProps {
  message?: string;
}

export default function Loading({ message = 'Загружаем меню...' }: LoadingProps) {
  return (
    <div className={styles.loading}>
      <div className={styles.spinner}></div>
      <div className={styles.message}>{message}</div>
    </div>
  );
}