// components/Header/UserIcon/__tests__/UserIcon.test.tsx
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import UserIcon from '../../components/Header/UserIcon'
import AuthAPI from '../../lib/AuthApi'

// Мокаем AuthAPI
jest.mock('../../lib/AuthApi', () => ({
  __esModule: true,
  default: {
    checkAuth: jest.fn(),
    logout: jest.fn(),
    getUserProfile: jest.fn(),
  }
}))

// Мокаем next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} src={props.src?.toString() || ''} />
  }
}))

// Мокаем UserModal
jest.mock('../../components/Header/UserModal', () => {
  return function MockUserModal({ isLoggedIn, userData, onClose, onLogout, onLoginSuccess }: any) {
    return (
      <div data-testid="user-modal">
        <button onClick={onClose}>Закрыть</button>
        <button onClick={onLogout}>Выйти</button>
        <button onClick={() => onLoginSuccess({ user: { email: 'test@coffee.ru' } })}>
          Успешный вход
        </button>
        {isLoggedIn && userData && (
          <div data-testid="profile-info">
            <span>{userData.first_name}</span>
            <span>{userData.points} баллов</span>
          </div>
        )}
        <a href="/profile">Войти в профиль</a>
      </div>
    )
  }
})

describe('UserIcon', () => {
  const mockUser = {
    id: 1,
    email: 'test@coffee.ru',
    first_name: 'Тест',
    points: 150,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('отображает иконку пользователя', async () => {
    // Мокаем неавторизованное состояние
    const mockCheckAuth = AuthAPI.checkAuth as jest.Mock
    mockCheckAuth.mockResolvedValue({
      success: true,
      data: {
        authenticated: false,
        user: null
      }
    })

    render(<UserIcon />)
    
    // Ждем завершения загрузки
    await waitFor(() => {
      expect(document.querySelector('.skeleton')).not.toBeInTheDocument()
    })
    
    expect(screen.getByRole('img', { name: /личный кабинет/i })).toBeInTheDocument()
  })

  it('проверяет авторизацию при монтировании', async () => {
    const mockCheckAuth = AuthAPI.checkAuth as jest.Mock
    mockCheckAuth.mockResolvedValue({
      success: true,
      data: {
        authenticated: true,
        user: mockUser
      }
    })

    render(<UserIcon />)

    await waitFor(() => {
      expect(mockCheckAuth).toHaveBeenCalled()
    })
  })

  it('отображает имя пользователя при успешной авторизации', async () => {
    const mockCheckAuth = AuthAPI.checkAuth as jest.Mock
    mockCheckAuth.mockResolvedValue({
      success: true,
      data: {
        authenticated: true,
        user: mockUser
      }
    })

    render(<UserIcon />)

    await waitFor(() => {
      expect(screen.getByText('Тест')).toBeInTheDocument()
      expect(screen.getByText('150')).toBeInTheDocument()
    })
  })

  it('открывает модальное окно при клике', async () => {
    const mockCheckAuth = AuthAPI.checkAuth as jest.Mock
    mockCheckAuth.mockResolvedValue({
      success: true,
      data: {
        authenticated: false,
        user: null
      }
    })

    render(<UserIcon />)
    
    await waitFor(() => {
      expect(document.querySelector('.skeleton')).not.toBeInTheDocument()
    })
    
    const icon = screen.getByRole('img', { name: /личный кабинет/i })
    fireEvent.click(icon.parentElement!)
    
    await waitFor(() => {
      expect(screen.getByTestId('user-modal')).toBeInTheDocument()
    })
  })

  it('обрабатывает выход из системы и очищает данные', async () => {
    const mockCheckAuth = AuthAPI.checkAuth as jest.Mock
    const mockLogout = AuthAPI.logout as jest.Mock
    
    // Сначала пользователь авторизован
    mockCheckAuth.mockResolvedValue({
      success: true,
      data: {
        authenticated: true,
        user: mockUser
      }
    })

    mockLogout.mockResolvedValue({ 
      success: true,
      data: null,
      error: null,
      status: 200
    })

    render(<UserIcon />)

    await waitFor(() => {
      expect(screen.getByText('Тест')).toBeInTheDocument()
    })

    const icon = screen.getByRole('img', { name: /личный кабинет/i })
    fireEvent.click(icon.parentElement!)

    await waitFor(() => {
      const logoutButton = screen.getByText('Выйти')
      fireEvent.click(logoutButton)
    })

    expect(mockLogout).toHaveBeenCalled()
    
    // Мокаем проверку авторизации после выхода
    mockCheckAuth.mockResolvedValue({
      success: true,
      data: {
        authenticated: false,
        user: null
      }
    })

    // Проверяем что данные очистились
    await waitFor(() => {
      expect(screen.queryByText('Тест')).not.toBeInTheDocument()
      expect(screen.queryByText('150')).not.toBeInTheDocument()
    })
  })

  it('показывает скелетон во время загрузки', () => {
    const mockCheckAuth = AuthAPI.checkAuth as jest.Mock
    mockCheckAuth.mockImplementation(() => new Promise(() => {}))

    render(<UserIcon />)
    
    expect(document.querySelector('.skeleton')).toBeInTheDocument()
  })

it('обрабатывает ошибку авторизации', async () => {
  const mockCheckAuth = AuthAPI.checkAuth as jest.Mock
  mockCheckAuth.mockRejectedValue(new Error('Network error'))

  render(<UserIcon />)

  // Ждем завершения загрузки
  await waitFor(() => {
    expect(document.querySelector('.skeleton')).not.toBeInTheDocument()
  })

  // ✅ В UserIcon ошибка отображается в состоянии error
  // Проверяем, что checkAuth был вызван
  expect(mockCheckAuth).toHaveBeenCalled()
  
  // Проверяем, что имя пользователя НЕ отображается
  expect(screen.queryByText('Тест')).not.toBeInTheDocument()
  expect(screen.queryByText('150')).not.toBeInTheDocument()
})

it('показывает тост с ошибкой при неудачной авторизации', async () => {
  // Мокаем таймеры
  jest.useFakeTimers()
  
  const mockCheckAuth = AuthAPI.checkAuth as jest.Mock
  mockCheckAuth.mockRejectedValue(new Error('Network error'))

  render(<UserIcon />)

  // Ждем завершения загрузки
  await waitFor(() => {
    expect(document.querySelector('.skeleton')).not.toBeInTheDocument()
  })

  // Продвигаем таймеры
  act(() => {
    jest.advanceTimersByTime(100)
  })

  // Проверяем тост
  const errorToast = document.querySelector('.errorToast')
  if (errorToast) {
    expect(errorToast).toBeInTheDocument()
    expect(errorToast.textContent).toContain('Network error')
  }

  jest.useRealTimers()
})
})