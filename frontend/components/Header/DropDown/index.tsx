// components/Header/DropDown
import { useEffect, useRef, useState } from 'react';
import styles from './dropdown.module.scss';
import { chevronDownSVG } from '../../../public/icons';
import Image from 'next/image';
import classNames from 'classnames';
import Link from 'next/link'; // ДОБАВИЛ ИМПОРТ LINK

// ИЗМЕНИЛ интерфейс props - добавил тип для options
interface DropdownProps {
    title: string;
    options: Array<{
        label: string;
        href: string;
    }>;
    onItemClick?: () => void; // ДОБАВИЛ опциональный обработчик клика
}

export default function Dropdown({ title, options, onItemClick }: DropdownProps) {
    const [dropdownActive, setDropdownActive] = useState<boolean>(false);
    const dropdownRef = useRef(null);

    const handleMouseEnter = () => {
        if (window.innerWidth >= 768) { // $breakpoint_desktop
            setDropdownActive(true);
        }
    };

    const handleMouseLeave = () => {
        if (window.innerWidth >= 768) {
            setDropdownActive(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownActive(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleChevronClick = (e) => {
        e.stopPropagation();
        setDropdownActive(!dropdownActive);
    };

    // ИЗМЕНИЛ обработчик клика по пункту
    const handleItemClick = () => {
        setDropdownActive(false);
        if (onItemClick) {
            onItemClick(); // Вызываем переданный обработчик
        }
    };

    // ИЗМЕНИЛ: Функция для получения href по названию пункта
    const getHrefForOption = (label: string): string => {
        const hrefMap = {
            'Напитки': '/menu/drinks',
            'Десерты': '/menu/desserts',
            'Сэндвичи и выпечка': '/menu/sandwiches',
            'Кофе': '/menu/drinks',
            'Чай': '/menu/drinks',
            'Снэки': '/menu/sandwiches',
            'Напитки в бутылках': '/menu/drinks',
        };
        return hrefMap[label] || '/menu';
    };

    return (
        <div ref={dropdownRef} className={dropdownActive ? styles.dropdownnew : styles.dropdown}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className={styles.dropdown_flex}>
                <p className={styles.title}>{title}</p>
                <Image
                    className={dropdownActive ? styles.dropdownChevronUp : styles.dropdownChevron}
                    onClick={handleChevronClick}
                    src={chevronDownSVG}
                    alt={dropdownActive ? 'стрелка вверх' : 'стрелка вниз'}
                />
            </div>

            {dropdownActive && (
                <ul className={styles.dropdown_content}>
                    {options.map((option, index) => {
                        // ИЗМЕНИЛ: Преобразуем строку в объект если нужно
                        const optionObj = typeof option === 'string'
                            ? { label: option, href: getHrefForOption(option) }
                            : option;

                        return (
                            <li
                                className={styles.coffeeMenu}
                                key={optionObj.label + index}
                            >
                                
                                <Link
                                    href={optionObj.href}
                                    className={styles.menuLink} 
                                    onClick={handleItemClick}
                                >
                                    {optionObj.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}