// app/profile/__tests__/ProfilePage.test.tsx
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import ProfilePage from '../../app/profile/page'
import AuthAPI from '../../lib/AuthApi'

// Мокаем next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

// Мокаем AuthAPI
jest.mock('../../lib/AuthApi', () => ({
  __esModule: true,
  default: {
    checkAuth: jest.fn(),
    getUserProfile: jest.fn(),
    getMyPurchases: jest.fn(),
    getMyStatistics: jest.fn(),
    updateUserProfile: jest.fn(),
    changeUserPassword: jest.fn(),
  }
}))

describe('ProfilePage', () => {
  const mockPush = jest.fn()
  const mockUser = {
    id: 1,
    email: 'test@coffee.ru',
    first_name: 'Тест',
    last_name: 'Пользователь',
    phone: '+7 (999) 123-45-67',
    points: 150,
    total_spent: 5000,
    visits_count: 12,
    date_joined: '2024-01-01T00:00:00Z',
    last_visit: '2024-02-11T15:30:00Z',
  }

  const mockPurchases = [
    {
      id: 1,
      purchase_date: '2024-02-10T14:30:00Z',
      total_amount: 1000,
      final_amount: 900,
      points_used: 100,
      points_earned: 50,
    },
    {
      id: 2,
      purchase_date: '2024-02-09T12:00:00Z',
      total_amount: 500,
      final_amount: 500,
      points_used: 0,
      points_earned: 25,
    },
  ]

  const mockStatistics = {
    summary: {
      average_receipt: 700,
    },
    loyalty: {
      level: 'Постоянный клиент',
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
      ; (useRouter as jest.Mock).mockReturnValue({ push: mockPush })

      // Мок успешной авторизации
      ; (AuthAPI.checkAuth as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          authenticated: true,
          user: mockUser
        }
      })

      // Мок данных профиля
      ; (AuthAPI.getUserProfile as jest.Mock).mockResolvedValue({
        success: true,
        data: mockUser
      })

      // Мок истории покупок
      ; (AuthAPI.getMyPurchases as jest.Mock).mockResolvedValue({
        success: true,
        data: mockPurchases,
        pagination: {
          current_page: 1,
          total_pages: 3,
          total_items: 15,
          items_per_page: 5,
        }
      })

      // Мок статистики
      ; (AuthAPI.getMyStatistics as jest.Mock).mockResolvedValue({
        success: true,
        data: mockStatistics
      })
  })

  // ============================================
  // ТЕСТЫ АВТОРИЗАЦИИ
  // ============================================

  it('перенаправляет на главную если пользователь не авторизован', async () => {
    ; (AuthAPI.checkAuth as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        authenticated: false,
        user: null
      }
    })

    await act(async () => {
      render(<ProfilePage />)
    })

    await waitFor(() => {
      expect(screen.getByText('Вы не авторизованы. Пожалуйста, войдите в систему.')).toBeInTheDocument()
      expect(screen.getByText('Повторить')).toBeInTheDocument()
      expect(screen.getByText('На главную')).toBeInTheDocument()
    })
  })

  it('показывает загрузку при открытии страницы', () => {
    render(<ProfilePage />)
    expect(screen.getByText('Загрузка профиля...')).toBeInTheDocument()
  })

  // ============================================
  // ТЕСТЫ ЗАГРУЗКИ И ОТОБРАЖЕНИЯ ДАННЫХ
  // ============================================

  it('загружает и отображает данные профиля', async () => {
    // ✅ Оборачиваем ВЕСЬ процесс рендера и загрузки данных
    await act(async () => {
      render(<ProfilePage />)
    })

    // ✅ Ждем, пока ВСЕ промисы внутри компонента разрешатся
    await waitFor(() => {
      expect(screen.queryByText('Загрузка профиля...')).not.toBeInTheDocument()
    })

    // ✅ Только после этого проверяем данные
    expect(screen.getByText('Тест Пользователь')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
  })

  it('отображает историю покупок с пагинацией', async () => {
    // ✅ Рендер в act
    await act(async () => {
      render(<ProfilePage />)
    })

    // ✅ Ждем загрузки
    await waitFor(() => {
      expect(screen.queryByText('Загрузка профиля...')).not.toBeInTheDocument()
    })

    // Проверяем историю
    await waitFor(() => {
      expect(screen.getByText(/10 февраля 2024 г\. в 17:30/)).toBeInTheDocument()
    })

    // ✅ Клик по пагинации в act
    await act(async () => {
      const nextButton = screen.getByText('→')
      fireEvent.click(nextButton)
    })

    await waitFor(() => {
      expect(AuthAPI.getMyPurchases).toHaveBeenCalledWith({
        page: 2,
        per_page: 5
      })
    })
  })

  // ============================================
  // ТЕСТЫ СМЕНЫ ПАРОЛЯ
  // ============================================

it('валидирует пустой текущий пароль', async () => {
  await act(async () => {
    render(<ProfilePage />)
  })

  await waitFor(() => {
    expect(screen.queryByText('Загрузка профиля...')).not.toBeInTheDocument()
  })

  // Открываем форму смены пароля
  await act(async () => {
    const changeButton = screen.getByText('Сменить пароль')
    fireEvent.click(changeButton)
  })

  await waitFor(() => {
    expect(screen.getByLabelText('Текущий пароль')).toBeInTheDocument()
  })

  // ✅ ВАЖНО: СНАЧАЛА заполняем новые пароли
  await act(async () => {
    const newPasswordInput = screen.getByLabelText('Новый пароль')
    const confirmInput = screen.getByLabelText('Подтверждение')
    await userEvent.type(newPasswordInput, 'newpass123')
    await userEvent.type(confirmInput, 'newpass123')
  })

  // ✅ Проверяем, что текущий пароль пустой
  const oldPasswordInput = screen.getByLabelText('Текущий пароль') as HTMLInputElement
  expect(oldPasswordInput.value).toBe('')

  // ✅ Сабмитим форму
  await act(async () => {
    const submitButton = screen.getByText('Изменить пароль')
    fireEvent.click(submitButton)
  })

  // ✅ ДОЛЖНО СРАБОТАТЬ! Первая валидация - пустой текущий пароль
  await waitFor(() => {
    expect(screen.getByText('Введите текущий пароль')).toBeInTheDocument()
  }, { timeout: 3000 })
})

  it('меняет пароль', async () => {
    const mockChangePassword = AuthAPI.changeUserPassword as jest.Mock
    mockChangePassword.mockResolvedValue({
      success: true
    })

    // ✅ Рендер в act
    await act(async () => {
      render(<ProfilePage />)
    })

    // ✅ Ждем загрузки
    await waitFor(() => {
      expect(screen.queryByText('Загрузка профиля...')).not.toBeInTheDocument()
    })

    // ✅ Клик по кнопке в act
    await act(async () => {
      const changeButton = screen.getByText('Сменить пароль')
      fireEvent.click(changeButton)
    })

    // ✅ Ждем появления формы
    await waitFor(() => {
      expect(screen.getByLabelText('Текущий пароль')).toBeInTheDocument()
    })

    // ✅ Ввод данных в act
    await act(async () => {
      const oldPasswordInput = screen.getByLabelText('Текущий пароль')
      const newPasswordInput = screen.getByLabelText('Новый пароль')
      const confirmInput = screen.getByLabelText('Подтверждение')

      await userEvent.type(oldPasswordInput, 'oldpass123')
      await userEvent.type(newPasswordInput, 'newpass123')
      await userEvent.type(confirmInput, 'newpass123')
    })

    // ✅ Сабмит формы в act
    await act(async () => {
      const submitButton = screen.getByText('Изменить пароль')
      fireEvent.click(submitButton)
    })

    // ✅ Проверяем вызов API
    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        old_password: 'oldpass123',
        new_password: 'newpass123',
        new_password_confirm: 'newpass123'
      })
    })

    // ✅ Проверяем сообщение об успехе
    await waitFor(() => {
      expect(screen.getByText('Пароль успешно изменен')).toBeInTheDocument()
    })
  })

  // ============================================
  // ТЕСТЫ РЕДАКТИРОВАНИЯ ПРОФИЛЯ
  // ============================================

  it('обновляет профиль', async () => {
    const mockUpdate = AuthAPI.updateUserProfile as jest.Mock
    mockUpdate.mockResolvedValue({
      success: true,
      data: { ...mockUser, first_name: 'НовоеИмя' }
    })

    // ✅ Рендер в act
    await act(async () => {
      render(<ProfilePage />)
    })

    // ✅ Ждем загрузки
    await waitFor(() => {
      expect(screen.queryByText('Загрузка профиля...')).not.toBeInTheDocument()
    })

    // ✅ Клик по кнопке в act
    await act(async () => {
      const editButton = screen.getByText('Редактировать')
      fireEvent.click(editButton)
    })

    // ✅ Ввод данных в act
    await act(async () => {
      const nameInput = screen.getByDisplayValue('Тест')
      await userEvent.clear(nameInput)
      await userEvent.type(nameInput, 'НовоеИмя')
    })

    // ✅ Сабмит формы в act
    await act(async () => {
      const saveButton = screen.getByText('Сохранить')
      fireEvent.click(saveButton)
    })

    // ✅ Проверяем вызов API
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ first_name: 'НовоеИмя' })
      )
    })

    // ✅ Проверяем сообщение об успехе
    await waitFor(() => {
      expect(screen.getByText('Профиль успешно обновлен')).toBeInTheDocument()
    })
  })
})