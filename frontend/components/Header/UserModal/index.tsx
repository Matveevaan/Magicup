//component/Header/UserModal/index.tsx

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { closeSVG, eyeSVG, eyeOffSVG } from '../../../public/icons'
import AuthAPI from '../../../lib/AuthApi'
import styles from './usermodal.module.scss'
import Link from 'next/link'

interface User {
  id: number;
  email: string;
  phone: string;
  points: number;
  total_spent: number;
  barcode: string;
  barcode_image?: string;
  visits_count: number;
  date_joined: string;
  last_visit: string | null;
  first_name?: string;
  last_name?: string;
}

interface UserModalProps {
  isLoggedIn: boolean
  userData: User | null
  onClose: () => void
  onLogout: () => Promise<void>
  onLoginSuccess: (data: any) => void
}

export default function UserModal({
  isLoggedIn,
  userData,
  onClose,
  onLogout,
  onLoginSuccess
}: UserModalProps) {
  const [isLoginForm, setIsLoginForm] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [barcodeImage, setBarcodeImage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password_confirm: '',
    phone: '',
    first_name: '', // Добавили поле имени
    last_name: '',  // Добавили поле фамилии
  })

  // Сброс формы при открытии/закрытии
  useEffect(() => {
    if (isLoggedIn && userData) {
      setFormData(prev => ({
        ...prev,
        email: userData.email || '',
        phone: userData.phone || '',
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
      }))

      if (userData.barcode_image) {
        setBarcodeImage(userData.barcode_image)
      } else if (userData.barcode) {
        loadBarcodeImage(userData.barcode)
      }
    } else {
      // Сбрасываем форму при разлогине
      setFormData({
        email: '',
        password: '',
        password_confirm: '',
        phone: '',
        first_name: '',
        last_name: '',
      })
      setBarcodeImage(null)
    }
  }, [isLoggedIn, userData])

  // Дополнительный сброс при переключении форм
  useEffect(() => {
    if (!isLoggedIn) {
      setFormData({
        email: '',
        password: '',
        password_confirm: '',
        phone: '',
        first_name: '',
        last_name: '',
      })
    }
  }, [isLoginForm, isLoggedIn])



  const loadBarcodeImage = async (barcode: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/accounts/profile/barcode-image/', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setBarcodeImage(data.barcode_image)
      }
    } catch (err) {
      console.error('Ошибка загрузки штрихкода:', err)
    }
  }

  const formatPhone = (phone?: string): string => {
    if (!phone) return ''
    const digits = phone.replace(/\D/g, '')
    if (digits.length === 11) {
      return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`
    }
    return phone
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const validateForm = (): boolean => {
    setError('')

    if (!isLoginForm) {
      if (!formData.email.includes('@')) {
        setError('Введите корректный email')
        return false
      }
      if (!formData.first_name.trim()) {
        setError('Введите имя')
        return false
      }
    }

    if (formData.password.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      return false
    }

    if (!isLoginForm && formData.password !== formData.password_confirm) {
      setError('Пароли не совпадают')
      return false
    }

    if (formData.phone && formData.phone.replace(/\D/g, '').length < 10) {
      setError('Введите корректный номер телефона')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!validateForm()) {
      setLoading(false)
      return
    }

    try {
      // ВАЖНО: Сначала получаем CSRF токен
      console.log('Получение CSRF токена...')
      const csrfResult = await AuthAPI.fetchCSRFToken()
      console.log('CSRF результат:', csrfResult)

      // Небольшая задержка для установки cookie
      await new Promise(resolve => setTimeout(resolve, 100))

      if (isLoginForm) {
        console.log('Попытка входа с email:', formData.email)
        const result = await AuthAPI.loginUser(formData.email, formData.password)
        console.log('Результат входа:', result)

        if (result.success) {
          onLoginSuccess(result.data)
          setSuccess('Вход выполнен успешно!')
          setTimeout(() => onClose(), 1500)
        } else {
          setError(result.error || 'Неверные данные для входа')
        }
      } else {
        // Регистрация
        // Очищаем телефон от всех нецифровых символов и приводим к формату +7XXXXXXXXXX
        const cleanPhone = formData.phone
          ? '+7' + formData.phone.replace(/\D/g, '').slice(-10) // берем последние 10 цифр
          : ''
        if (formData.phone && cleanPhone.length !== 12) { // +7 + 10 цифр = 12 символов
          setError('Телефон должен содержать 10 цифр после +7')
          setLoading(false)
          return
        }
        console.log('📝 Отправка данных регистрации:', {
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: cleanPhone,
          password: '***'
        })

        const result = await AuthAPI.registerUser({
          email: formData.email,
          password: formData.password,
          password_confirm: formData.password_confirm,
          phone: cleanPhone,
          first_name: formData.first_name,
          last_name: formData.last_name,
        })

        console.log('📝 Результат регистрации (полный):', result)
        console.log('📝 Данные ошибки:', result.data)

        if (result.success) {
          onLoginSuccess(result.data)
          setSuccess('Регистрация прошла успешно!')
          setTimeout(() => onClose(), 1500)
        } else {
          // Показываем детальную информацию об ошибке
          let errorMessage = 'Ошибка при регистрации'

          if (result.data) {
            // Если пришел объект с ошибками
            if (typeof result.data === 'object') {
              try {
                errorMessage = JSON.stringify(result.data, null, 2)
              } catch {
                errorMessage = String(result.data)
              }
            } else {
              errorMessage = String(result.data)
            }
          } else if (result.error) {
            errorMessage = result.error
          }

          setError(errorMessage)
          console.error('Детали ошибки:', result.data)
        }
      }
    } catch (err: any) {
      console.error('Ошибка:', err)
      setError(err.message || 'Ошибка соединения с сервером')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    if (name === 'phone') {
      let digits = value.replace(/\D/g, '')
      let formatted = ''

      if (digits.length > 0) {
        formatted = '+7 '
        if (digits.length > 1) digits = digits.slice(1)
        if (digits.length > 0) formatted += '(' + digits.slice(0, 3)
        if (digits.length > 3) formatted += ') ' + digits.slice(3, 6)
        if (digits.length > 6) formatted += '-' + digits.slice(6, 8)
        if (digits.length > 8) formatted += '-' + digits.slice(8, 10)
      }

      setFormData(prev => ({ ...prev, [name]: formatted }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleFormSwitch = () => {
    setIsLoginForm(!isLoginForm)
    setError('')
    setSuccess('')
    setFormData({
      email: '',
      password: '',
      password_confirm: '',
      phone: '',
      first_name: '',
      last_name: '',
    })
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  const handleLogout = async () => {
    setLoading(true)
    await onLogout()
    setLoading(false)
    onClose()
  }

  const getUserDisplayName = () => {
    if (!userData) return ''

    if (userData.first_name) {
      return userData.first_name + (userData.last_name ? ` ${userData.last_name}` : '')
    }

    return userData.email?.split('@')[0] || 'Пользователь'
  }

  const renderBarcode = () => {
    if (!userData?.barcode) {
      return (
        <div className={styles.barcodeError}>
          Штрихкод не доступен
        </div>
      )
    }

    if (!/^\d{13}$/.test(userData.barcode)) {
      return (
        <div className={styles.barcodeError}>
          Неверный формат штрихкода
        </div>
      )
    }

    return (
      <div className={styles.ean13Barcode}>
        <div className={styles.barcodeContainer}>
          {barcodeImage ? (
            <img
              src={barcodeImage}
              alt={`Штрихкод ${userData.barcode}`}
              className={styles.barcodeImage}
            />
          ) : (
            <div className={styles.simpleBarcode}>
              <div className={styles.barcodeBars}>
                {userData.barcode.split('').map((digit, index) => (
                  <div
                    key={index}
                    className={styles.barcodeBar}
                    style={{
                      height: `${40 + parseInt(digit) * 4}px`
                    }}
                  />
                ))}
              </div>
              <div className={styles.barcodeNumbers}>
                {userData.barcode}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Закрыть">
          <Image
            src={closeSVG}
            alt="Закрыть"
            width={20}
            height={20}
            unoptimized={true}
          />
        </button>

        {isLoggedIn && userData ? (
          <div className={styles.profile}>
            <div className={styles.avatar}>
              {userData.first_name?.charAt(0)?.toUpperCase() || userData.email?.charAt(0)?.toUpperCase() || 'П'}
            </div>

            <h3 className={styles.userName}>{getUserDisplayName()}</h3>
            <p className={styles.userEmail}>{userData.email}</p>
            <Link href="/profile" className={styles.profileLink} onClick={onClose}>
              {/* <span className={styles.profileLinkIcon}>👤</span> */}
              Войти в профиль
            </Link>
            {/* Основная информация */}
            {/* <div className={styles.userInfoGrid}> */}
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Баллы:</span>
              <span className={styles.infoValue}>{userData.points || 0}</span>
            </div>

            {/* <div className={styles.infoItem}>
                <span className={styles.infoLabel}>С нами с:</span>
                <span className={styles.infoValue}>
                  {userData.date_joined ? formatDate(userData.date_joined) : 'Недавно'}
                </span>
              </div> */}
            {/* </div> */}

            {/* Штрихкод */}
            <div className={styles.barcodeSection}>
              <h4 className={styles.sectionTitle}>Штрихкод лояльности</h4>
              {renderBarcode()}
              <p className={styles.barcodeHint}>
                Покажите на кассе для начисления баллов
              </p>
            </div>

            <button
              className={styles.logoutButton}
              onClick={handleLogout}
              disabled={loading}
            >
              {loading ? 'Выход...' : 'Выйти из аккаунта'}
            </button>
          </div>
        ) : (
          <div className={styles.auth}>
            <div className={styles.authHeader}>


              <h2 className={styles.title}>
                {isLoginForm ? 'Вход' : 'Регистрация'}
              </h2>
              <p className={styles.subtitle}>
                {isLoginForm
                  ? 'Войдите в систему лояльности'
                  : 'Зарегистрируйтесь для накопления баллов'
                }
              </p>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              {!isLoginForm && (
                <>
                  <div className={styles.nameFields}>
                    <div className={styles.inputGroup}>
                      <label htmlFor="first_name">
                        Имя <span className={styles.required}>*</span>
                      </label>
                      <input
                        type="text"
                        id="first_name"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        placeholder="Иван"
                        required={!isLoginForm}
                        className={styles.input}
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label htmlFor="last_name">Фамилия</label>
                      <input
                        type="text"
                        id="last_name"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        placeholder="Иванов"
                        className={styles.input}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className={styles.inputGroup}>
                <label htmlFor="email">
                  Email {!isLoginForm && <span className={styles.required}>*</span>}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="example@mail.ru"
                  required
                  className={styles.input}
                />
              </div>

              {!isLoginForm && (
                <div className={styles.inputGroup}>
                  <label htmlFor="phone">Телефон</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+7 (999) 123-45-67"
                    className={styles.input}
                  />
                </div>
              )}

              <div className={styles.inputGroup}>
                <label htmlFor="password">
                  Пароль {!isLoginForm && <span className={styles.required}>*</span>}
                </label>
                <div className={styles.passwordWrapper}>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={isLoginForm ? "Ваш пароль" : "Минимум 6 символов"}
                    required
                    minLength={6}
                    className={styles.input}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    <Image
                      src={showPassword ? eyeOffSVG : eyeSVG}
                      alt={showPassword ? "Скрыть" : "Показать"}
                      width={20}
                      height={20}
                    />
                  </button>
                </div>
              </div>

              {isLoginForm && (
                <div className={styles.forgotPassword}>
                  <button
                    type="button"
                    className={styles.forgotPasswordButton}
                    onClick={() => {
                      // TODO: открыть модалку восстановления пароля
                      alert('Функция восстановления пароля будет доступна в ближайшее время')
                    }}
                  >
                    Забыли пароль?
                  </button>
                </div>
              )}

              {!isLoginForm && (
                <div className={styles.inputGroup}>
                  <label htmlFor="password_confirm">
                    Подтвердите пароль <span className={styles.required}>*</span>
                  </label>
                  <div className={styles.passwordWrapper}>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="password_confirm"
                      name="password_confirm"
                      value={formData.password_confirm}
                      onChange={handleChange}
                      placeholder="Повторите пароль"
                      required
                      minLength={6}
                      className={styles.input}
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Скрыть пароль" : "Показать пароль"}
                    >
                      <Image
                        src={showConfirmPassword ? eyeOffSVG : eyeSVG}
                        alt={showConfirmPassword ? "Скрыть" : "Показать"}
                        width={20}
                        height={20}
                      />
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className={styles.error}>
                  <span className={styles.errorIcon}>⚠️</span> {error}
                </div>
              )}

              {success && (
                <div className={styles.success}>
                  <span className={styles.successIcon}>✅</span> {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={styles.submitButton}
              >
                {loading ? (
                  <>
                    <span className={styles.spinner}></span>
                    Загрузка...
                  </>
                ) : isLoginForm ? (
                  'Войти'
                ) : (
                  'Создать аккаунт'
                )}
              </button>
            </form>

            <div className={styles.switchForm}>
              <span className={styles.switchText}>
                {isLoginForm ? 'Еще нет аккаунта?' : 'Уже есть аккаунт?'}
              </span>
              <button
                type="button"
                onClick={handleFormSwitch}
                className={styles.switchButton}
              >
                {isLoginForm ? 'Создать аккаунт →' : 'Войти →'}
              </button>
            </div>

            {/* {isLoginForm && (
              <div className={styles.demoHint}>
                <p className={styles.demoTitle}>Демо-доступ:</p>
                <p>Email: <code>test@coffee.ru</code></p>
                <p>Пароль: <code>password123</code></p>
              </div>
            )} */}
          </div>
        )}
      </div>
    </div>
  )
}