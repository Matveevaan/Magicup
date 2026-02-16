// components/Header/UserModal/__tests__/UserModal.test.tsx
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UserModal from '../../components/Header/UserModal'
import AuthAPI from '../../lib/AuthApi'

// Мокаем AuthAPI
jest.mock('../../lib/AuthApi', () => ({
  __esModule: true,
  default: {
    login: jest.fn(),
    registerUser: jest.fn(),
  }
}))

// Мокаем next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    const { unoptimized, ...validProps } = props
    return <img {...validProps} alt={props.alt} src={props.src?.toString() || ''} />
  }
}))

describe('UserModal', () => {
  const mockOnClose = jest.fn()
  const mockOnLogout = jest.fn()
  const mockOnLoginSuccess = jest.fn()

  const mockUserData = {
    id: 1,
    email: 'test@coffee.ru',
    first_name: 'Тест',
    last_name: 'Пользователь',
    phone: '+79991234567',
    points: 150,
    total_spent: 5000,
    visits_count: 12,
    barcode: '4601234567890',
    date_joined: '2024-01-01T00:00:00Z',
    last_visit: '2024-02-11T15:30:00Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ============================================
  // ТЕСТЫ НЕАВТОРИЗОВАННОГО ПОЛЬЗОВАТЕЛЯ
  // ============================================

  describe('неавторизованный пользователь', () => {
    it('отображает форму входа', () => {
      render(
        <UserModal
          isLoggedIn={false}
          userData={null}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
          onLoginSuccess={mockOnLoginSuccess}
        />
      )
      
      expect(screen.getByText('Вход')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Пароль')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument()
    })

    it('переключается на форму регистрации', async () => {
      render(
        <UserModal
          isLoggedIn={false}
          userData={null}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
          onLoginSuccess={mockOnLoginSuccess}
        />
      )

      const switchButton = screen.getByText('Создать аккаунт →')
      await act(async () => {
        fireEvent.click(switchButton)
      })

      expect(screen.getByText('Регистрация')).toBeInTheDocument()
      expect(screen.getByLabelText('Имя *')).toBeInTheDocument()
    })

    it('выполняет вход с валидными данными', async () => {
      const mockLogin = AuthAPI.login as jest.Mock
      mockLogin.mockResolvedValue({
        success: true,
        data: {
          user: mockUserData
        }
      })

      render(
        <UserModal
          isLoggedIn={false}
          userData={null}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
          onLoginSuccess={mockOnLoginSuccess}
        />
      )

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Пароль')
      
      await act(async () => {
        await userEvent.type(emailInput, 'test@coffee.ru')
        await userEvent.type(passwordInput, 'password123')
      })

      const submitButton = screen.getByRole('button', { name: 'Войти' })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@coffee.ru', 'password123')
        expect(mockOnLoginSuccess).toHaveBeenCalled()
      })
    })

    it('показывает ошибку при коротком пароле', async () => {
      render(
        <UserModal
          isLoggedIn={false}
          userData={null}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
          onLoginSuccess={mockOnLoginSuccess}
        />
      )

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Пароль')
      
      await act(async () => {
        await userEvent.type(emailInput, 'test@coffee.ru')
        await userEvent.type(passwordInput, '12345')
      })

      const submitButton = screen.getByRole('button', { name: 'Войти' })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Пароль должен быть не менее 6 символов')).toBeInTheDocument()
      })
    })

    it('успешно регистрирует нового пользователя', async () => {
      const mockRegister = AuthAPI.registerUser as jest.Mock
      mockRegister.mockResolvedValue({
        success: true,
        data: {
          user: mockUserData
        }
      })

      render(
        <UserModal
          isLoggedIn={false}
          userData={null}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
          onLoginSuccess={mockOnLoginSuccess}
        />
      )

      const switchButton = screen.getByText('Создать аккаунт →')
      await act(async () => {
        fireEvent.click(switchButton)
      })

      await waitFor(() => {
        expect(screen.getByLabelText('Имя *')).toBeInTheDocument()
      })

      const nameInput = screen.getByLabelText('Имя *')
      const emailInput = screen.getByLabelText('Email *')
      const phoneInput = screen.getByLabelText('Телефон')
      const passwordInput = screen.getAllByLabelText('Пароль *')[0]
      const confirmInput = screen.getByLabelText('Подтвердите пароль *')

      await act(async () => {
        await userEvent.type(nameInput, 'Новый')
        await userEvent.type(emailInput, 'new@coffee.ru')
        await userEvent.type(phoneInput, '9991234567')
        await userEvent.type(passwordInput, 'password123')
        await userEvent.type(confirmInput, 'password123')
      })

      expect(phoneInput).toHaveValue('+7 (999) 123-45-67')

      const submitButton = screen.getByRole('button', { name: 'Создать аккаунт' })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      // ✅ Проверяем, что API вызван
      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          email: 'new@coffee.ru',
          password: 'password123',
          password_confirm: 'password123',
          phone: '+79991234567',
          first_name: 'Новый',
          last_name: '',
        })
      })

      // ✅ Проверяем, что onLoginSuccess вызван
      expect(mockOnLoginSuccess).toHaveBeenCalled()
    })
it('валидирует пустое имя при регистрации', async () => {
  render(
    <UserModal
      isLoggedIn={false}
      userData={null}
      onClose={mockOnClose}
      onLogout={mockOnLogout}
      onLoginSuccess={mockOnLoginSuccess}
    />
  )

  const switchButton = screen.getByText('Создать аккаунт →')
  await act(async () => {
    fireEvent.click(switchButton)
  })

  await waitFor(() => {
    expect(screen.getByLabelText('Email *')).toBeInTheDocument()
  })

  // ✅ ВАЖНО: Заполняем ВСЕ поля, КРОМЕ имени
  const emailInput = screen.getByLabelText('Email *')
  const phoneInput = screen.getByLabelText('Телефон')     // <-- ОБЯЗАТЕЛЬНО!
  const passwordInput = screen.getAllByLabelText('Пароль *')[0]
  const confirmInput = screen.getByLabelText('Подтвердите пароль *')

  await act(async () => {
    await userEvent.type(emailInput, 'test@coffee.ru')
    await userEvent.type(phoneInput, '9991234567')       // <-- ЗАПОЛНЯЕМ ТЕЛЕФОН!
    await userEvent.type(passwordInput, 'password123')
    await userEvent.type(confirmInput, 'password123')
  })

  const submitButton = screen.getByRole('button', { name: 'Создать аккаунт' })
  await act(async () => {
    fireEvent.click(submitButton)
  })

  // ✅ Теперь ошибка появится
  await waitFor(() => {
    expect(screen.getByText('Введите имя')).toBeInTheDocument()
  }, { timeout: 3000 })
})

    it('обрабатывает ошибку при регистрации - email уже существует', async () => {
      const mockRegister = AuthAPI.registerUser as jest.Mock
      mockRegister.mockResolvedValue({
        success: false,
        error: 'Пользователь с таким email уже существует'
      })

      render(
        <UserModal
          isLoggedIn={false}
          userData={null}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
          onLoginSuccess={mockOnLoginSuccess}
        />
      )

      const switchButton = screen.getByText('Создать аккаунт →')
      await act(async () => {
        fireEvent.click(switchButton)
      })

      await waitFor(() => {
        expect(screen.getByLabelText('Имя *')).toBeInTheDocument()
      })

      const nameInput = screen.getByLabelText('Имя *')
      const emailInput = screen.getByLabelText('Email *')
      const phoneInput = screen.getByLabelText('Телефон')
      const passwordInput = screen.getAllByLabelText('Пароль *')[0]
      const confirmInput = screen.getByLabelText('Подтвердите пароль *')

      await act(async () => {
        await userEvent.type(nameInput, 'Тест')
        await userEvent.type(emailInput, 'existing@coffee.ru')
        await userEvent.type(phoneInput, '9991234567')
        await userEvent.type(passwordInput, 'password123')
        await userEvent.type(confirmInput, 'password123')
      })

      const submitButton = screen.getByRole('button', { name: 'Создать аккаунт' })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(screen.getByText('Пользователь с таким email уже существует')).toBeInTheDocument()
      })
    })

    it('показывает ошибку при несовпадающих паролях', async () => {
      render(
        <UserModal
          isLoggedIn={false}
          userData={null}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
          onLoginSuccess={mockOnLoginSuccess}
        />
      )

      const switchButton = screen.getByText('Создать аккаунт →')
      await act(async () => {
        fireEvent.click(switchButton)
      })

      await waitFor(() => {
        expect(screen.getByLabelText('Имя *')).toBeInTheDocument()
      })

      const nameInput = screen.getByLabelText('Имя *')
      const emailInput = screen.getByLabelText('Email *')
      const passwordInput = screen.getAllByLabelText('Пароль *')[0]
      const confirmInput = screen.getByLabelText('Подтвердите пароль *')

      await act(async () => {
        await userEvent.type(nameInput, 'Тест')
        await userEvent.type(emailInput, 'test@coffee.ru')
        await userEvent.type(passwordInput, 'password123')
        await userEvent.type(confirmInput, 'different123')
      })

      const submitButton = screen.getByRole('button', { name: 'Создать аккаунт' })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Пароли не совпадают')).toBeInTheDocument()
      })
    })
  })

  // ============================================
  // ТЕСТЫ АВТОРИЗОВАННОГО ПОЛЬЗОВАТЕЛЯ
  // ============================================

  describe('авторизованный пользователь', () => {
    beforeEach(() => {
      render(
        <UserModal
          isLoggedIn={true}
          userData={mockUserData}
          onClose={mockOnClose}
          onLogout={mockOnLogout}
          onLoginSuccess={mockOnLoginSuccess}
        />
      )
    })

    it('отображает профиль пользователя', () => {
      expect(screen.getByText('Тест Пользователь')).toBeInTheDocument()
      expect(screen.getByText('test@coffee.ru')).toBeInTheDocument()
      expect(screen.getByText('150')).toBeInTheDocument()
    })

    it('отображает штрихкод', () => {
      expect(screen.getByText('4601234567890')).toBeInTheDocument()
    })

    it('вызывает onLogout при клике на выход', async () => {
      const logoutButton = screen.getByRole('button', { name: /выйти из аккаунта/i })
      
      await act(async () => {
        fireEvent.click(logoutButton)
      })

      expect(mockOnLogout).toHaveBeenCalled()
    })

    it('закрывается при клике на крестик', async () => {
      const closeButton = screen.getByLabelText('Закрыть')
      
      await act(async () => {
        fireEvent.click(closeButton)
      })

      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  // ============================================
  // ТЕСТЫ ВЗАИМОДЕЙСТВИЯ
  // ============================================

  describe('взаимодействие', () => {
    const localMockOnClose = jest.fn()
    const localMockOnLogout = jest.fn()
    const localMockOnLoginSuccess = jest.fn()

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('переключает видимость пароля', async () => {
      render(
        <UserModal
          isLoggedIn={false}
          userData={null}
          onClose={localMockOnClose}
          onLogout={localMockOnLogout}
          onLoginSuccess={localMockOnLoginSuccess}
        />
      )

      const passwordInput = screen.getByLabelText('Пароль')
      const toggleButton = screen.getByLabelText('Показать пароль')

      expect(passwordInput).toHaveAttribute('type', 'password')

      await act(async () => {
        fireEvent.click(toggleButton)
      })

      expect(passwordInput).toHaveAttribute('type', 'text')
    })

    it('закрывается при клике на оверлей', async () => {
      render(
        <UserModal
          isLoggedIn={false}
          userData={null}
          onClose={localMockOnClose}
          onLogout={localMockOnLogout}
          onLoginSuccess={localMockOnLoginSuccess}
        />
      )

      const overlay = document.querySelector('.modalOverlay')
      expect(overlay).toBeInTheDocument()
      
      await act(async () => {
        fireEvent.click(overlay!)
      })

      expect(localMockOnClose).toHaveBeenCalled()
    })

    it('не закрывается при клике на модальное окно', async () => {
      render(
        <UserModal
          isLoggedIn={false}
          userData={null}
          onClose={localMockOnClose}
          onLogout={localMockOnLogout}
          onLoginSuccess={localMockOnLoginSuccess}
        />
      )

      const modal = document.querySelector('.modal')
      expect(modal).toBeInTheDocument()
      
      await act(async () => {
        fireEvent.click(modal!)
      })

      expect(localMockOnClose).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // ТЕСТЫ ОБРАБОТКИ ОШИБОК
  // ============================================

  describe('обработка ошибок', () => {
    const localMockOnClose = jest.fn()
    const localMockOnLogout = jest.fn()
    const localMockOnLoginSuccess = jest.fn()

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('обрабатывает ошибку сети при входе', async () => {
      const mockLogin = AuthAPI.login as jest.Mock
      mockLogin.mockRejectedValue(new Error('Network error'))

      render(
        <UserModal
          isLoggedIn={false}
          userData={null}
          onClose={localMockOnClose}
          onLogout={localMockOnLogout}
          onLoginSuccess={localMockOnLoginSuccess}
        />
      )

      const emailInput = screen.getByLabelText('Email')
      const passwordInput = screen.getByLabelText('Пароль')
      
      await act(async () => {
        await userEvent.type(emailInput, 'test@coffee.ru')
        await userEvent.type(passwordInput, 'password123')
      })

      const submitButton = screen.getByRole('button', { name: 'Войти' })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/ошибка соединения с сервером/i)).toBeInTheDocument()
      })
    })

    it('обрабатывает ошибку при регистрации - неверный формат телефона', async () => {
      render(
        <UserModal
          isLoggedIn={false}
          userData={null}
          onClose={localMockOnClose}
          onLogout={localMockOnLogout}
          onLoginSuccess={localMockOnLoginSuccess}
        />
      )

      const switchButton = screen.getByText('Создать аккаунт →')
      await act(async () => {
        fireEvent.click(switchButton)
      })

      await waitFor(() => {
        expect(screen.getByLabelText('Имя *')).toBeInTheDocument()
      })

      const nameInput = screen.getByLabelText('Имя *')
      const emailInput = screen.getByLabelText('Email *')
      const phoneInput = screen.getByLabelText('Телефон')
      const passwordInput = screen.getAllByLabelText('Пароль *')[0]
      const confirmInput = screen.getByLabelText('Подтвердите пароль *')

      await act(async () => {
        await userEvent.type(nameInput, 'Тест')
        await userEvent.type(emailInput, 'test@coffee.ru')
        await userEvent.type(phoneInput, '12345')
        await userEvent.type(passwordInput, 'password123')
        await userEvent.type(confirmInput, 'password123')
      })

      const submitButton = screen.getByRole('button', { name: 'Создать аккаунт' })
      await act(async () => {
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Введите корректный номер телефона')).toBeInTheDocument()
      })
    })
  })

  // ============================================
  // ТЕСТЫ РАЗЛИЧНЫХ СОСТОЯНИЙ
  // ============================================

  describe('различные состояния данных', () => {
    const localMockOnClose = jest.fn()
    const localMockOnLogout = jest.fn()
    const localMockOnLoginSuccess = jest.fn()

    it('отображает аватар с первой буквой имени', () => {
      render(
        <UserModal
          isLoggedIn={true}
          userData={{ ...mockUserData, first_name: 'Анна' }}
          onClose={localMockOnClose}
          onLogout={localMockOnLogout}
          onLoginSuccess={localMockOnLoginSuccess}
        />
      )

      const avatar = screen.getByText('А')
      expect(avatar).toBeInTheDocument()
      expect(avatar).toHaveClass('avatar')
    })

    it('отображает аватар с первой буквой email если нет имени', () => {
      render(
        <UserModal
          isLoggedIn={true}
          userData={{ 
            ...mockUserData, 
            first_name: '', 
            last_name: '',
            email: 'test@coffee.ru' 
          }}
          onClose={localMockOnClose}
          onLogout={localMockOnLogout}
          onLoginSuccess={localMockOnLoginSuccess}
        />
      )

      const avatar = screen.getByText('T')
      expect(avatar).toBeInTheDocument()
    })

    it('отображает сообщение об ошибке штрихкода если его нет', () => {
      render(
        <UserModal
          isLoggedIn={true}
          userData={{ ...mockUserData, barcode: '' }}
          onClose={localMockOnClose}
          onLogout={localMockOnLogout}
          onLoginSuccess={localMockOnLoginSuccess}
        />
      )

      expect(screen.getByText('Штрихкод не доступен')).toBeInTheDocument()
    })
  })
})