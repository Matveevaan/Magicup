// components/Header/HeaderMenu.tsx
import Dropdown from '../DropDown';
import styles from './headermenu.module.scss';
import Link from 'next/link';

export default function HeaderMenu() {
    return (
        <div className={styles.main}>
            <div className={styles.menu}>
                <div className={styles.menuLine}>
                    <Link href='/'>
                        Главная
                    </Link>
                </div>
                <div className={styles.menuLine}>
                    <Link href="/promotions">
                        Акции
                    </Link>
                </div>
                <div className={styles.dropdown}>
                   <Dropdown
                               title={'Меню'}
                               options={[
                                 { label: 'Все', href: '/menu' },
                                 { label: 'Напитки', href: '/menu?menu_type=drinks' },
                                 { label: 'Десерты', href: '/menu?menu_type=desserts' },
                                 { label: 'Сэндвичи и выпечка', href: '/menu?menu_type=sandwiches' }
                               ]}                               
                             />
                </div>
                
                <div className={styles.menuLine}>
                    <Link href='/about'>
                        О нас
                    </Link>
                </div>
                <div className={styles.menuLine}>
                    <Link href='/blog'>
                        Блог
                    </Link>
                </div>
            </div>
        </div>
    )
}