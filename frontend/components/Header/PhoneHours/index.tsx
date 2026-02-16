// components/PhoneHours/index.tsx
import Link from "next/link";
import styles from './phonehours.module.scss';

export default function PhoneHours() {
    return (
        <div className={styles.phoneHours}>
            <div className={styles.phone}>
                <Link href="tel:+79104705667">+7 (910) 470-56-67</Link>
            </div>
            <div className={styles.hours}>
                Пн.-Вс.: с 09:00 до 21:00
            </div>
        </div>
    );
}