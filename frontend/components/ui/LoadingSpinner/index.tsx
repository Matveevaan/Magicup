import styles from './loadingspinner.module.scss';

const LoadingSpinner = () => {
  return (
    <div className={styles.spinnerContainer}>
      <div className={styles.spinner} />
    </div>
  );
};

export default LoadingSpinner;