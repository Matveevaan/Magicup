//components/Header/UserIcon/index/tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { personSVG } from '../../../public/icons'
import AuthAPI from '../../../lib/AuthApi'
import UserModal from '../UserModal'
import styles from './usericon.module.scss'

// Типы для TypeScript
interface UserData {
  id: number;
  email: string;
  phone: string;
  points: number;
  total_spent: number;
  barcode: string;
  visits_count: number;
  date_joined: string;
  last_visit: string | null;
  first_name?: string;
  last_name?: string;
}

export default function UserIcon() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkAuth = useCallback(async () => {
  setLoading(true)
  setError(null)
  
  try {
    console.log('🔍 Проверка авторизации...')
    const result = await AuthAPI.checkAuth()
    
    console.log('📦 Весь результат:', result)
    console.log('📦 data:', result.data)
    console.log('📦 Тип данных:', typeof result.data)
    console.log('📦 authenticated:', result.data?.authenticated)
    console.log('📦 user:', result.data?.user)
    
    // Ваш бэкенд возвращает { authenticated: true, user: {...} }
    if (result?.data?.authenticated === true && result?.data?.user) {
      console.log('✅ Пользователь авторизован!')
      setUserData(result.data.user)
      setIsLoggedIn(true)
    } else {
      console.log('❌ Пользователь не авторизован')
      console.log('❌ authenticated =', result?.data?.authenticated)
      console.log('❌ user =', result?.data?.user)
      setIsLoggedIn(false)
      setUserData(null)
    }
  } catch (err: any) {
    console.error('❌ Ошибка:', err)
    setIsLoggedIn(false)
    setUserData(null)
  } finally {
    setLoading(false)
  }
}, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const handleLoginSuccess = useCallback((responseData: any) => {
    if (responseData?.user) {
      setUserData(responseData.user)
      setIsLoggedIn(true)
    } else {
      // Если нет данных в response, запрашиваем профиль
      AuthAPI.getProfile().then(result => {
        if (result.success && result.data) {
          setUserData(result.data)
          setIsLoggedIn(true)
        }
      })
    }
    setShowModal(false)
  }, [])

  const handleLogout = useCallback(async () => {
  setLoading(true)
  try {
    const result = await AuthAPI.logoutUser()
    
    if (result.success) {
      // Очищаем состояние
      setIsLoggedIn(false)
      setUserData(null)
      
      // Очищаем кэш и cookies на клиенте
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      
      // Принудительно очищаем кэш страницы
      if (typeof window !== 'undefined') {
        // Очищаем sessionStorage и localStorage
        sessionStorage.clear()
        localStorage.clear()
        
        // Перенаправляем на главную с полной перезагрузкой страницы
        window.location.href = '/'
      }
    } else {
      setError(result.error || 'Ошибка выхода')
    }
  } catch (err: any) {
    console.error('Logout error:', err)
    setError(err.message)
  } finally {
    setLoading(false)
    setShowModal(false)
  }
}, [])

  const getUserName = () => {
    if (!userData) return ''
    
    if (userData.first_name) {
      return userData.first_name + (userData.last_name ? ` ${userData.last_name}` : '')
    }
    
    const email = userData.email || ''
    return email.split('@')[0] || email
  }

  const handleOpenModal = () => {
    // Перед открытием сбрасываем ошибки
    setError(null)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
  }

  if (loading) {
    return <div className={styles.skeleton}></div>
  }

  return (
    <>
      <div 
        className={styles.userIcon}
        onClick={handleOpenModal}
        title={isLoggedIn ? `${getUserName()} (${userData?.points} баллов)` : 'Войти в аккаунт'}
      >
        <Image 
          src={personSVG} 
          alt="Личный кабинет" 
          width={24} 
          height={24}
          style={{ width: 'auto', height: 'auto' }}
          className={styles.icon}
        />
        
        {isLoggedIn && userData && (
          <span className={styles.userName}>
            {getUserName()}
            {userData.points > 0 && (
              <span className={styles.pointsBadge}>
                {userData.points}
              </span>
            )}
          </span>
        )}
        
        {isLoggedIn && <div className={styles.statusDot}></div>}
      </div>

      {showModal && (
        <UserModal
          key={`modal-${isLoggedIn}-${Date.now()}`}
          isLoggedIn={isLoggedIn}
          userData={userData}
          onClose={handleCloseModal}
          onLogout={handleLogout}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {error && (
        <div className={styles.errorToast}>
          {error}
        </div>
      )}
    </>
  )
}