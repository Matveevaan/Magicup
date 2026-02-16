// components/Header/index.tsx
'use client'
import Link from 'next/link'
import styles from './header.module.scss'
import { burgerSVG, logo } from '../../public/icons'
import Image from 'next/image'
import { BurgerMenu } from './BurgerMenu';
import { useState } from 'react';
import HeaderMenu from './HeaderMenu';
import UserIcon from './UserIcon'

export function Header() {
    const [burgerActive, setBurgerActive] = useState<boolean>(false);
    return (
        <header className={styles.head}>
            <div className="iscontainer">
                <nav className={styles.nav}>
                    <div className={styles.logo_name}>
                        <Link href="/">
                            <Image className={styles.logo} src={logo} alt="logo" />
                        </Link>
                       <p className={styles.name} >МАДЖИКАП</p>
                    </div>
                    
                    {/* Для экранов < 768px - UserIcon слева от бургера */}
                    <div className={styles.mobileSection}>
                        <div className={styles.userIconMobile}>
                            <UserIcon />
                        </div>
                        <BurgerMenu 
                            burgerActive={burgerActive} 
                            setBurgerActive={setBurgerActive} 
                        />
                    </div>
                    
                    {/* Для экранов > 768px */}
                    <div className={styles.desktopSection}>
                        <HeaderMenu />
                        <div className={styles.userIconDesktop}>
                            <UserIcon />
                        </div>
                    </div>
                </nav>
            </div>
        </header>
    )
}