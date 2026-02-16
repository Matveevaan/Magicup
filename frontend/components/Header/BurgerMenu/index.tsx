// components/Header/BurgerMenu/BurgerMenu.tsx
import styles from './burgermenu.module.scss';
import Image from 'next/image';
import { burgerSVG, closeSVG, geolocationSVG, maxSVG, telegramSVG } from '../../../public/icons';
import React, { useEffect } from 'react';
import Dropdown from '../DropDown';
import classNames from 'classnames';
import Button from '../../ui/Button';
import Link from 'next/link';
import PhoneHours from '../PhoneHours';

export function BurgerMenu({ burgerActive, setBurgerActive }) {
  useEffect(() => {
    if (burgerActive) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [burgerActive]);

  const handleOverlayClick = () => {
    setBurgerActive(false);
  };

  const handleMenuItemClick = () => {
    setBurgerActive(false);
  };

  return (
    <div className={styles.main}>
      {/* Кнопка бургера/закрытия */}
      {burgerActive ? (
        <Image
          onClick={() => setBurgerActive(false)}
          className={styles.close}
          src={closeSVG}
          alt="Закрыть меню"
        />
      ) : (
        <Image
          onClick={() => setBurgerActive(true)}
          className={styles.burger}
          src={burgerSVG}
          alt="Открыть меню"
        />
      )}

      {/* Оверлей */}
      <div
        className={classNames(styles.menuOverlay, {
          [styles.active]: burgerActive
        })}
        onClick={handleOverlayClick}
      />

      {/* Само меню */}
      <div
        className={classNames(styles.menu, {
          [styles.active]: burgerActive
        })}
      >

        <div className={classNames(styles.listMenu, 'iscontainer')}>
          <div className={styles.menuLine}>
            <Link href='/' onClick={handleMenuItemClick}>
              Главная
            </Link>
          </div>

          <div className={styles.menuLine}>
            <Link href="/promotions" onClick={handleMenuItemClick}>
              Акции
            </Link>
          </div>

          {/* ИЗМЕНИЛ: Добавил onItemClick в Dropdown */}
          <Dropdown
            title={'Меню'}
            options={[
              { label: 'Все', href: '/menu' },
              { label: 'Напитки', href: '/menu?menu_type=drinks' },
              { label: 'Десерты', href: '/menu?menu_type=desserts' },
              { label: 'Сэндвичи и выпечка', href: '/menu?menu_type=sandwiches' }
            ]}
            onItemClick={handleMenuItemClick}
          />

          {/* АЛЬТЕРНАТИВА: Можно оставить старый формат, он тоже будет работать */}
          {/* <Dropdown
            title={'Меню'}
            options={['Напитки', 'Десерты', 'Сэндвичи и выпечка']}
            onItemClick={handleMenuItemClick}
          /> */}

          <div className={styles.menuLine}>
            <Link href='/about' onClick={handleMenuItemClick}>
              О нас
            </Link>
          </div>

          <div className={styles.menuLine}>
            <Link href='/blog' onClick={handleMenuItemClick}>
              Блог
            </Link>
          </div>

          {/* <div>
            <Button className={styles.button} onClick={handleMenuItemClick}>
              Оставить отзыв
            </Button>
          </div> */}

          

          <PhoneHours />

          <div className={styles.geolocation}>
            <Image className={styles.geo} src={geolocationSVG} alt='Иконка геолокации' />
            <div className={styles.geolocationText}>
              <p className={styles.geolocationCity}>Москва</p>
              <p className={styles.geolocationAdress}>ул.Вешняковская, 18А</p>
            </div>
          </div>

          <div className={styles.icons}>
            <Link href='#' onClick={handleMenuItemClick}>
              <Image className={styles.telegram} src={telegramSVG} alt='Иконка Telegram' />
            </Link>
            <Link href='#' onClick={handleMenuItemClick}>
              <Image className={styles.max} src={maxSVG} alt='Иконка Макс' />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}