// app/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthAPI from '../../lib/AuthApi'
import styles from './profile.module.scss'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [purchases, setPurchases] = useState<any[]>([])
  const [statistics, setStatistics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Данные для редактирования профиля
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  })
  const [isEditing, setIsEditing] = useState(false)
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' })

  // Данные для смены пароля
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: ''
  })
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' })

  // Пагинация
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const ITEMS_PER_PAGE = 5

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (user) {
      loadPurchases(currentPage)
    }
  }, [user, currentPage])
useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  const checkAuthAndLoadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Проверяем авторизацию
      const authCheck = await AuthAPI.checkAuth()
      
      if (!authCheck?.data?.authenticated) {
        // Если не авторизован, перенаправляем на главную
        console.log('Пользователь не авторизован, перенаправление...')
        router.push('/')
        return
      }
      
      // Загружаем данные профиля
      await loadUserData()
      
    } catch (error) {
      console.error('Ошибка проверки авторизации:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }
  const loadUserData = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log('📋 Загрузка профиля...')

      // 1. Сначала проверяем авторизацию через checkAuth
      const authCheck = await AuthAPI.checkAuth()
      console.log('📋 Auth check:', authCheck)

      if (!authCheck?.data?.authenticated) {
        setError('Вы не авторизованы. Пожалуйста, войдите в систему.')
        setLoading(false)
        return
      }

      // 2. Загружаем профиль
      const profile = await AuthAPI.getUserProfile()
      console.log('Profile response:', profile)

      // 3. Проверяем, что profile.success это true
      if (profile.success === true) {
        const userData = profile.data
        console.log('Профиль загружен:', userData)

        setUser(userData)
        setFormData({
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          email: userData.email || '',
          phone: userData.phone || ''
        })
      } else {
        // Если profile.success === false, значит ошибка
        console.error('❌ Ошибка загрузки профиля:', profile.error)
        setError(profile.error || 'Не удалось загрузить данные профиля')
      }

      // 4. Загружаем статистику
      try {
        const stats = await AuthAPI.getMyStatistics()
        if (stats.success) {
          setStatistics(stats.data)
        }
      } catch (err) {
        console.error('Ошибка загрузки статистики:', err)
      }

    } catch (error) {
      console.error('❌ Ошибка загрузки данных:', error)
      setError('Ошибка соединения с сервером')
    } finally {
      setLoading(false)
    }
  }

  const loadPurchases = async (page: number) => {
    try {
      console.log('Загрузка покупок для страницы:', page)

      const response = await AuthAPI.getMyPurchases({
        page: page,
        per_page: ITEMS_PER_PAGE
      })

      console.log('Полный ответ API:', response)

      if (response.success) {
        // Правильная структура: { success: true, data: [...] }
        if (response.data && Array.isArray(response.data)) {
          const purchasesData = response.data
          console.log('✅ Найдено покупок:', purchasesData.length)
          console.log('Первая покупка:', purchasesData[0])

          setPurchases(purchasesData)
          setTotalItems(purchasesData.length)
          setTotalPages(Math.ceil(purchasesData.length / ITEMS_PER_PAGE))
        }
        else if (response.data && response.data.data && Array.isArray(response.data.data)) {
          // Альтернативная структура
          const purchasesData = response.data.data
          console.log('✅ Найдено покупок (в data.data):', purchasesData.length)

          setPurchases(purchasesData)

          if (response.data.pagination) {
            setTotalItems(response.data.pagination.total_items || purchasesData.length)
            setTotalPages(response.data.pagination.total_pages || 1)
          }
        }
        else {
          console.log('❌ Неизвестная структура данных:', response.data)
          setPurchases([])
        }
      } else {
        console.log('❌ Ошибка загрузки:', response.error)
        setPurchases([])
      }
    } catch (error) {
      console.error('❌ Ошибка:', error)
      setPurchases([])
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMessage({ type: '', text: '' })
    console.log('📤 Отправляемые данные:', formData)
    const hasChanges =
      formData.first_name !== user.first_name ||
      formData.last_name !== user.last_name ||
      formData.email !== user.email ||
      formData.phone !== user.phone

    if (!hasChanges) {
      setProfileMessage({ type: 'info', text: 'Нет изменений для сохранения' })
      return
    }

    try {
      const result = await AuthAPI.updateUserProfile(formData)
      console.log('📥 Ответ сервера:', result)
      if (result.success) {
        setUser({ ...user, ...formData })
        setIsEditing(false)
        setProfileMessage({ type: 'success', text: 'Профиль успешно обновлен' })
        setTimeout(() => setProfileMessage({ type: '', text: '' }), 3000)
      } else {
        setProfileMessage({ type: 'error', text: result.error || 'Ошибка обновления' })
      }
    } catch (error) {
      setProfileMessage({ type: 'error', text: 'Ошибка соединения' })
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage({ type: '', text: '' })

    if (!passwordData.old_password) {
      setPasswordMessage({ type: 'error', text: 'Введите текущий пароль' })
      return
    }

    if (passwordData.new_password.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Новый пароль должен быть не менее 6 символов' })
      return
    }

    if (passwordData.new_password !== passwordData.new_password_confirm) {
      setPasswordMessage({ type: 'error', text: 'Новые пароли не совпадают' })
      return
    }

    try {
      const result = await AuthAPI.changeUserPassword(passwordData)
      if (result.success) {
        setShowPasswordForm(false)
        setPasswordData({
          old_password: '',
          new_password: '',
          new_password_confirm: ''
        })
        setPasswordMessage({ type: 'success', text: 'Пароль успешно изменен' })
        setTimeout(() => setPasswordMessage({ type: '', text: '' }), 3000)
      } else {
        setPasswordMessage({ type: 'error', text: result.error || 'Ошибка смены пароля' })
      }
    } catch (error) {
      setPasswordMessage({ type: 'error', text: 'Ошибка соединения' })
    }
  }

  const formatDate = (dateString: string) => {
  if (!dateString) return 'Дата неизвестна'
  
  try {
    // Пробуем распарсить дату
    const date = new Date(dateString)
    
    // Проверяем, валидная ли дата
    if (isNaN(date.getTime())) {
      // Если не получилось, пробуем другой формат
      const parts = dateString.split(/[ .:]/)
      if (parts.length >= 5) {
        // Формат "14.02.2026 22:09"
        return dateString // Возвращаем как есть
      }
      return 'Дата неизвестна'
    }
    
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.error('Ошибка форматирования даты:', error)
    return dateString || 'Дата неизвестна'
  }
}

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // app/profile/page.tsx

const formatPhone = (phone: string) => {
  if (!phone) return 'Не указан'
  
  // Удаляем все нецифровые символы
  const digits = phone.replace(/\D/g, '')
  
  // Проверяем, что у нас достаточно цифр
  if (digits.length < 11) return phone
  
  // Формат: +7 (XXX) XXX-XX-XX
  // digits: 79107777777 -> +7 (910) 777-77-77
  const country = digits[0] === '8' ? '7' : digits[0] // Если начинается с 8, меняем на 7
  const code = digits.slice(1, 4)
  const first = digits.slice(4, 7)
  const second = digits.slice(7, 9)
  const third = digits.slice(9, 11)
  
  return `+${country} (${code}) ${first}-${second}-${third}`
}

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <h2>{error}</h2>
        <div className={styles.errorActions}>
          <button onClick={loadUserData} className={styles.retryButton}>
            Повторить
          </button>
          <button onClick={() => router.push('/')} className={styles.loginButton}>
            На главную
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.profilePage}>
      <div className="iscontainer">
        {/* Шапка профиля */}
        <div className={styles.profileHeader}>
          <div className={styles.avatar}>
            {user?.first_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase()}
          </div>
          <div className={styles.userInfo}>
            <h1>{user?.first_name || 'Пользователь'} {user?.last_name || ''}</h1>
            <p className={styles.userEmail}>{user?.email}</p>
            <div className={styles.stats}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{user?.points || 0}</span>
                <span className={styles.statLabel}>баллов</span>
              </div>
              <div className={styles.statDivider}>•</div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{user?.visits_count || 0}</span>
                <span className={styles.statLabel}>посещений</span>
              </div>
              <div className={styles.statDivider}>•</div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{formatCurrency(user?.total_spent || 0)}</span>
                <span className={styles.statLabel}>₽ потрачено</span>
              </div>
            </div>
          </div>
        </div>

        {/* Блок личных данных */}
        <div className={styles.block}>
          <div className={styles.blockHeader}>
            <h2>Личные данные</h2>
            {!isEditing && (
              <button
                className={styles.editButton}
                onClick={() => setIsEditing(true)}
              >
                Редактировать
              </button>
            )}
          </div>

          {profileMessage.text && (
            <div className={`${styles.message} ${styles[profileMessage.type]}`}>
              {profileMessage.text}
            </div>
          )}

          {!isEditing ? (
            <div className={styles.infoGrid}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Имя:</span>
                <span className={styles.infoValue}>{user?.first_name || 'Не указано'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Фамилия:</span>
                <span className={styles.infoValue}>{user?.last_name || 'Не указано'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Email:</span>
                <span className={styles.infoValue}>{user?.email}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Телефон:</span>
                <span className={styles.infoValue}>{formatPhone(user?.phone)}</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleProfileUpdate} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="first_name">Имя</label>
                <input
                  type="text"
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="Введите имя"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="last_name">Фамилия</label>
                <input
                  type="text"
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Введите фамилию"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Введите email"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="phone">Телефон</label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.saveButton}>
                  Сохранить
                </button>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => {
                    setIsEditing(false)
                    setFormData({
                      first_name: user?.first_name || '',
                      last_name: user?.last_name || '',
                      email: user?.email || '',
                      phone: user?.phone || ''
                    })
                    setProfileMessage({ type: '', text: '' })
                  }}
                >
                  Отмена
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Блок смены пароля */}
        <div className={styles.block}>
          <div className={styles.blockHeader}>
            <h2>Безопасность</h2>
            {!showPasswordForm && (
              <button
                className={styles.changeButton}
                onClick={() => setShowPasswordForm(true)}
              >
                Сменить пароль
              </button>
            )}
          </div>

          {passwordMessage.text && (
            <div className={`${styles.message} ${styles[passwordMessage.type]}`}>
              {passwordMessage.text}
            </div>
          )}

          {!showPasswordForm ? (
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Пароль:</span>
              <span className={styles.infoValue}>••••••••</span>
            </div>
          ) : (
            <form onSubmit={handlePasswordChange} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="old_password">Текущий пароль</label>
                <input
                  type="password"
                  id="old_password"
                  value={passwordData.old_password}
                  onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                  placeholder="Введите текущий пароль"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="new_password">Новый пароль</label>
                <input
                  type="password"
                  id="new_password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  placeholder="Минимум 6 символов"
                  required
                  minLength={6}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="new_password_confirm">Подтверждение</label>
                <input
                  type="password"
                  id="new_password_confirm"
                  value={passwordData.new_password_confirm}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password_confirm: e.target.value })}
                  placeholder="Повторите новый пароль"
                  required
                />
              </div>
              <div className={styles.formActions}>
                <button type="submit" className={styles.saveButton}>
                  Изменить пароль
                </button>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => {
                    setShowPasswordForm(false)
                    setPasswordData({
                      old_password: '',
                      new_password: '',
                      new_password_confirm: ''
                    })
                    setPasswordMessage({ type: '', text: '' })
                  }}
                >
                  Отмена
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Блок истории покупок */}
<div className={styles.block}>
  <div className={styles.blockHeader}>
    <h2>История покупок</h2>
    {totalItems > 0 && (
      <span className={styles.totalCount}>Всего: {totalItems}</span>
    )}
  </div>

  {purchases.length === 0 ? (
    <p className={styles.noData}>У вас пока нет покупок</p>
  ) : (
    <>
      <div className={styles.purchasesList}>
        {purchases.map((purchase: any) => (
          <div key={purchase.id} className={styles.purchaseCard}>
            <div className={styles.purchaseHeader}>
              <span className={styles.purchaseDate}>
                {formatDate(purchase.purchase_date)}
              </span>
              <span className={styles.purchaseTotal}>
                {formatCurrency(purchase.final_amount)} ₽
              </span>
            </div>
            
            {/* Детали товаров - проверяем оба возможных поля */}
            {purchase.items_detail && purchase.items_detail.length > 0 ? (
              <div className={styles.purchaseItems}>
                {purchase.items_detail.map((item: any, index: number) => (
                  <div key={index} className={styles.purchaseItem}>
                    <span className={styles.itemName}>
                      {item.product_name || item.productName} 
                      {item.variant_name || item.variantName ? ` (${item.variant_name || item.variantName})` : ''}
                    </span>
                    <span className={styles.itemQuantity}>x{item.quantity}</span>
                    <span className={styles.itemPrice}>
                      {formatCurrency(item.total || item.price * item.quantity)} ₽
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.purchaseSummary}>
                {purchase.items_summary || 'Состав чека не указан'}
              </div>
            )}
            
            <div className={styles.purchaseDetails}>
              <span className={styles.purchaseOriginal}>
                Сумма: {formatCurrency(purchase.total_amount)} ₽
              </span>
              {purchase.points_used > 0 && (
                <span className={styles.purchaseDiscount}>
                  Скидка: -{purchase.points_used} баллов
                </span>
              )}
              <span className={styles.purchaseEarned}>
                Начислено: +{purchase.points_earned} баллов
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageButton}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            ←
          </button>
          <span className={styles.pageInfo}>
            {currentPage} из {totalPages}
          </span>
          <button
            className={styles.pageButton}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            →
          </button>
        </div>
      )}
    </>
  )}
</div>


      </div>
    </div>
  )
}