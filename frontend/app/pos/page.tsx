'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthAPI from '../../lib/AuthApi'
import { menuApi, Product, ProductVariant } from '../../lib/menuApi'
import styles from './pos.module.scss'

// Типы для корзины
interface CartItem {
  id: string
  productId: number
  productName: string
  variantId: number
  variantName: string
  price: number
  quantity: number
  total: number
}

interface Customer {
  id: number
  name: string
  email: string
  phone: string
  points: number
  barcode: string
  barcode_image?: string
}

export default function POSPage() {
  const router = useRouter()
  
  // Состояния
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [isStaff, setIsStaff] = useState(false)
  const [cashierName, setCashierName] = useState('')
  
  // Меню
  const [menuItems, setMenuItems] = useState<{
    drinks: Product[],
    desserts: Product[],
    sandwiches: Product[]
  }>({
    drinks: [],
    desserts: [],
    sandwiches: []
  })
  
  const [activeMenuType, setActiveMenuType] = useState<string>('drinks')
  const [loading, setLoading] = useState(true)
  
  // Корзина
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartTotal, setCartTotal] = useState(0)
  
  // Клиент
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const [customerError, setCustomerError] = useState('')
  
  // Баллы
  const [usePoints, setUsePoints] = useState(false)
  const [pointsDiscount, setPointsDiscount] = useState(0)
  const [pointsEarned, setPointsEarned] = useState(0)
  const [finalAmount, setFinalAmount] = useState(0)
  
  // Процесс покупки
  const [processing, setProcessing] = useState(false)
  const [purchaseResult, setPurchaseResult] = useState<any>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  
  // Поиск
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [showSearch, setShowSearch] = useState(false)
  
  // Модальное окно выбора объема
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)

  // Проверка авторизации при загрузке
  useEffect(() => {
    checkAuth()
  }, [])

  // Загрузка меню
  useEffect(() => {
    if (isStaff) {
      loadMenu()
    }
  }, [isStaff])

  // Обновление итогов при изменении корзины или использовании баллов
  useEffect(() => {
    calculateTotals()
  }, [cart, usePoints, customer])

  // Проверка авторизации и прав
  const checkAuth = async () => {
    try {
      const result = await AuthAPI.checkAuth()
      
      if (result?.data?.authenticated) {
        setIsAuthorized(true)
        
        // Проверяем, является ли пользователь сотрудником
        if (result.data.user?.is_staff || result.data.user?.is_superuser) {
          setIsStaff(true)
          setCashierName(result.data.user.first_name || 'Кассир')
        } else {
          // Если не сотрудник - редирект на главную
          router.push('/')
        }
      } else {
        setIsAuthorized(false)
        router.push('/')
      }
    } catch (error) {
      console.error('Ошибка проверки авторизации:', error)
      setIsAuthorized(false)
      router.push('/')
    }
  }

  // Загрузка меню 
  const loadMenu = async () => {
    setLoading(true)
    try {
      // Получаем все товары
      const products = await menuApi.getProducts()
      
      console.log('Загружены товары:', products)
      
      if (Array.isArray(products)) {
        // Группируем по menu_type
        const grouped = {
          drinks: products.filter(p => p.menu_type === 'drinks'),
          desserts: products.filter(p => p.menu_type === 'desserts'),
          sandwiches: products.filter(p => p.menu_type === 'sandwiches')
        }
        
        console.log('Сгруппированные товары:', grouped)
        setMenuItems(grouped)
      } else {
        setMenuItems({
          drinks: [],
          desserts: [],
          sandwiches: []
        })
      }
    } catch (error) {
      console.error('Ошибка загрузки меню:', error)
    } finally {
      setLoading(false)
    }
  }

  // Поиск товаров
  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length >= 2) {
      const results = await menuApi.search(query)
      setSearchResults(Array.isArray(results) ? results : [])
      setShowSearch(true)
    } else {
      setSearchResults([])
      setShowSearch(false)
    }
  }

  // Обработка клика по товару
  const handleProductClick = (product: Product) => {
    // Если у товара несколько вариантов, показываем модальное окно
    if (product.variants && product.variants.length > 1) {
      setSelectedProduct(product)
      // По умолчанию выбираем первый доступный вариант
      const defaultVariant = product.variants.find(v => v.is_default) || product.variants[0]
      setSelectedVariant(defaultVariant)
      setShowVariantModal(true)
    } else if (product.variants && product.variants.length === 1) {
      // Если только один вариант, добавляем сразу
      addToCart(product, product.variants[0])
    }
  }

  // Добавление товара в корзину с выбранным вариантом
  const addToCart = (product: Product, variant: ProductVariant) => {
    const price = typeof variant.price === 'string' 
      ? parseFloat(variant.price) 
      : variant.price
    
    // Проверяем, есть ли уже такой товар в корзине
    const existingItemIndex = cart.findIndex(
      item => item.productId === product.id && item.variantId === variant.id
    )
    
    if (existingItemIndex >= 0) {
      // Увеличиваем количество
      const updatedCart = [...cart]
      const item = updatedCart[existingItemIndex]
      item.quantity += 1
      item.total = item.price * item.quantity
      setCart(updatedCart)
    } else {
      // Добавляем новый товар
      const newItem: CartItem = {
        id: `${Date.now()}-${Math.random()}`,
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        variantName: variant.volume_value || variant.volume_name || 'Стандарт',
        price: price,
        quantity: 1,
        total: price
      }
      setCart([...cart, newItem])
    }
    
    // Закрываем модальное окно если оно было открыто
    setShowVariantModal(false)
    setSelectedProduct(null)
    setSelectedVariant(null)
  }

  // Удаление товара из корзины
  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId))
  }

  // Изменение количества
  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeFromCart(itemId)
      return
    }
    
    const updatedCart = cart.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          quantity: newQuantity,
          total: item.price * newQuantity
        }
      }
      return item
    })
    
    setCart(updatedCart)
  }

  // Очистка корзины
  const clearCart = () => {
    setCart([])
    setCustomer(null)
    setBarcodeInput('')
    setUsePoints(false)
    setCustomerError('')
  }

  // Расчет итогов
  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0)
    
    if (customer && usePoints && customer.points > 0) {
      const maxPointsToUse = Math.min(customer.points, Math.floor(subtotal), 100)
      setPointsDiscount(maxPointsToUse)
      setFinalAmount(subtotal - maxPointsToUse)
      
      const earned = Math.floor((subtotal - maxPointsToUse) * 0.05)
      setPointsEarned(earned)
    } else {
      setPointsDiscount(0)
      setFinalAmount(subtotal)
      setPointsEarned(Math.floor(subtotal * 0.05))
    }
  }

  // Поиск клиента по штрихкоду
  const findCustomer = async () => {
    if (!barcodeInput.trim()) {
      setCustomerError('Введите штрихкод')
      return
    }
    
    setScanning(true)
    setCustomerError('')
    
    try {
      const result = await AuthAPI.findCustomerByBarcode(barcodeInput.trim())
      
      if (result.success && result.data?.found) {
        setCustomer(result.data.customer)
        setCustomerError('')
      } else {
        setCustomer(null)
        setCustomerError('Клиент не найден')
      }
    } catch (error) {
      setCustomerError('Ошибка поиска клиента')
    } finally {
      setScanning(false)
    }
  }

  // Обработка ввода штрихкода (для сканера)
  const handleBarcodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      findCustomer()
    }
  }

  // Оформление покупки
  const processPurchase = async () => {
    if (!customer) {
      setCustomerError('Не выбран клиент')
      return
    }
    
    if (cart.length === 0) {
      alert('Корзина пуста')
      return
    }
    
    setProcessing(true)
    
    try {
      const cartItems = cart.map(item => ({
        productId: item.productId,
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        price: item.price,
        total: item.total
      }))
      
      const purchaseData = {
        barcode: customer.barcode,
        amount: finalAmount,
        use_points: usePoints,
        cart_items: cartItems
      }
      
      const result = await AuthAPI.processPurchase(purchaseData)
      
      if (result.success) {
        setPurchaseResult(result.data)
        setShowReceipt(true)
        
        if (result.data.points_balance !== undefined) {
          setCustomer({
            ...customer,
            points: result.data.points_balance
          })
        }
        
        setTimeout(() => {
          setShowReceipt(false)
          clearCart()
        }, 5000)
      } else {
        alert(result.error || 'Ошибка при оформлении покупки')
      }
    } catch (error) {
      console.error('❌ Ошибка:', error)
      alert('Ошибка соединения')
    } finally {
      setProcessing(false)
    }
  }

  // Быстрая покупка (без баллов)
  const quickPurchase = async () => {
    setUsePoints(false)
    await processPurchase()
  }

  // Форматирование цены
  const formatPrice = (price: number) => {
    return `${price.toFixed(2)} ₽`
  }

  if (!isStaff) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Проверка доступа...</p>
      </div>
    )
  }

  return (
    <div className={styles.posContainer}>
      {/* Левая панель - Меню */}
      <div className={styles.menuPanel}>
        <div className={styles.menuHeader}>
          <h1>POS-терминал</h1>
          <div className={styles.cashierInfo}>
            <span className={styles.cashierName}>{cashierName}</span>
            <button 
              className={styles.logoutButton}
              onClick={async () => {
                await AuthAPI.logoutUser()
                router.push('/')
              }}
            >
              Выйти
            </button>
          </div>
        </div>

        {/* Поиск */}
        <div className={styles.searchSection}>
          <input
            type="text"
            placeholder="🔍 Поиск товаров..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className={styles.searchInput}
          />
          {showSearch && searchResults.length > 0 && (
            <div className={styles.searchResults}>
              {searchResults.map(product => (
                <button
                  key={product.id}
                  className={styles.searchResultItem}
                  onClick={() => {
                    handleProductClick(product)
                    setShowSearch(false)
                    setSearchQuery('')
                  }}
                >
                  <span className={styles.searchResultName}>{product.name}</span>
                  <span className={styles.searchResultPrice}>
                    от {formatPrice(product.min_price)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Табы меню */}
        <div className={styles.menuTabs}>
          <button
            className={`${styles.menuTab} ${activeMenuType === 'drinks' ? styles.active : ''}`}
            onClick={() => setActiveMenuType('drinks')}
          >
            ☕ Напитки
          </button>
          <button
            className={`${styles.menuTab} ${activeMenuType === 'desserts' ? styles.active : ''}`}
            onClick={() => setActiveMenuType('desserts')}
          >
            🍰 Десерты
          </button>
          <button
            className={`${styles.menuTab} ${activeMenuType === 'sandwiches' ? styles.active : ''}`}
            onClick={() => setActiveMenuType('sandwiches')}
          >
            🥪 Сэндвичи
          </button>
        </div>

        {/* Сетка товаров */}
        <div className={styles.menuGrid}>
          {loading ? (
            <div className={styles.loadingGrid}>Загрузка меню...</div>
          ) : (
            menuItems[activeMenuType as keyof typeof menuItems]?.map((product: Product) => (
              <button
                key={product.id}
                className={styles.menuItem}
                onClick={() => handleProductClick(product)}
                disabled={!product.is_available}
              >
                {product.image_url && (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className={styles.menuItemImage}
                  />
                )}
                <span className={styles.menuItemName}>{product.name}</span>
                <span className={styles.menuItemPrice}>
                  от {formatPrice(product.min_price)}
                </span>
                {product.variants && product.variants.length > 1 && (
                  <span className={styles.variantBadge}>
                    {product.variants.length} варианта
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Правая панель - Корзина */}
      <div className={styles.cartPanel}>
        {/* Поиск клиента */}
        <div className={styles.customerSection}>
          <h3>Клиент</h3>
          <div className={styles.barcodeInput}>
            <input
              type="text"
              placeholder="Штрихкод клиента"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeKeyDown}
              disabled={scanning}
              autoFocus
            />
            <button 
              onClick={findCustomer}
              disabled={scanning}
            >
              {scanning ? '🔍' : 'Найти'}
            </button>
          </div>
          
          {customerError && (
            <div className={styles.customerError}>{customerError}</div>
          )}
          
          {customer && (
            <div className={styles.customerInfo}>
              <div className={styles.customerName}>{customer.name}</div>
              <div className={styles.customerPoints}>
                Баллов: <strong>{customer.points}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Корзина */}
        <div className={styles.cartSection}>
          <div className={styles.cartHeader}>
            <h3>Корзина</h3>
            {cart.length > 0 && (
              <button onClick={clearCart} className={styles.clearCart}>
                Очистить
              </button>
            )}
          </div>

          <div className={styles.cartItems}>
            {cart.length === 0 ? (
              <div className={styles.emptyCart}>
                Корзина пуста
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className={styles.cartItem}>
                  <div className={styles.cartItemInfo}>
                    <div className={styles.cartItemName}>{item.productName}</div>
                    <div className={styles.cartItemVariant}>{item.variantName}</div>
                  </div>
                  <div className={styles.cartItemPrice}>
                    {formatPrice(item.price)} ×
                  </div>
                  <div className={styles.cartItemQuantity}>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className={styles.quantityButton}
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className={styles.quantityButton}
                    >
                      +
                    </button>
                  </div>
                  <div className={styles.cartItemTotal}>
                    {formatPrice(item.total)}
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className={styles.removeItem}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Итоги и оплата */}
        {cart.length > 0 && (
          <div className={styles.checkoutSection}>
            {customer && (
              <div className={styles.pointsSection}>
                <label className={styles.pointsCheckbox}>
                  <input
                    type="checkbox"
                    checked={usePoints}
                    onChange={(e) => setUsePoints(e.target.checked)}
                    disabled={!customer || customer.points === 0}
                  />
                  <span>Использовать баллы ({customer.points} доступно)</span>
                </label>
                
                {usePoints && pointsDiscount > 0 && (
                  <div className={styles.pointsDiscount}>
                    Скидка баллами: -{pointsDiscount} ₽
                  </div>
                )}
              </div>
            )}

            <div className={styles.totals}>
              <div className={styles.totalRow}>
                <span>Сумма:</span>
                <span>{formatPrice(cart.reduce((sum, item) => sum + item.total, 0))}</span>
              </div>
              
              {pointsDiscount > 0 && (
                <div className={`${styles.totalRow} ${styles.discountRow}`}>
                  <span>Скидка:</span>
                  <span>-{formatPrice(pointsDiscount)}</span>
                </div>
              )}
              
              <div className={`${styles.totalRow} ${styles.finalRow}`}>
                <span>ИТОГО:</span>
                <span>{formatPrice(finalAmount)}</span>
              </div>
              
              {pointsEarned > 0 && (
                <div className={styles.pointsEarned}>
                  Будет начислено: +{pointsEarned} баллов
                </div>
              )}
            </div>

            <div className={styles.paymentButtons}>
              <button
                className={styles.payButton}
                onClick={processPurchase}
                disabled={processing || !customer}
              >
                {processing ? 'Оформление...' : 'Оплатить'}
              </button>
              
              <button
                className={styles.quickPayButton}
                onClick={quickPurchase}
                disabled={processing || !customer}
              >
                Быстрая оплата
              </button>
            </div>
          </div>
        )}

        {/* Чек покупки */}
        {showReceipt && purchaseResult && (
          <div className={styles.receipt}>
            <div className={styles.receiptHeader}>
              <h4>ЧЕК #{purchaseResult.purchase_id}</h4>
              <button onClick={() => setShowReceipt(false)}>✕</button>
            </div>
            <div className={styles.receiptBody}>
              <p>Клиент: {purchaseResult.customer}</p>
              <p>Сумма: {formatPrice(purchaseResult.amount)}</p>
              {purchaseResult.points_used > 0 && (
                <p>Списано баллов: {purchaseResult.points_used}</p>
              )}
              <p>Итог: {formatPrice(purchaseResult.final_amount)}</p>
              <p>Начислено баллов: +{purchaseResult.points_earned}</p>
              <p>Баланс: {purchaseResult.points_balance} баллов</p>
              <p className={styles.receiptTime}>
                {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно выбора объема */}
      {showVariantModal && selectedProduct && (
        <div className={styles.modalOverlay} onClick={() => setShowVariantModal(false)}>
          <div className={styles.variantModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Выберите объем</h3>
              <button 
                className={styles.modalClose}
                onClick={() => setShowVariantModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.productInfo}>
                {selectedProduct.image_url && (
                  <img 
                    src={selectedProduct.image_url} 
                    alt={selectedProduct.name}
                    className={styles.modalProductImage}
                  />
                )}
                <h4>{selectedProduct.name}</h4>
              </div>
              
              <div className={styles.variantsList}>
                {selectedProduct.variants?.map(variant => (
                  <button
                    key={variant.id}
                    className={`${styles.variantOption} ${selectedVariant?.id === variant.id ? styles.selected : ''}`}
                    onClick={() => setSelectedVariant(variant)}
                  >
                    <span className={styles.variantVolume}>
                      {variant.volume_name && variant.volume_value 
                        ? `${variant.volume_name} (${variant.volume_value})`
                        : variant.volume_value || 'Стандарт'
                      }
                    </span>
                    <span className={styles.variantPrice}>
                      {formatPrice(parseFloat(variant.price))}
                    </span>
                    {variant.calories && (
                      <span className={styles.variantCalories}>
                        {variant.calories} ккал
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowVariantModal(false)}
              >
                Отмена
              </button>
              <button
                className={styles.addButton}
                onClick={() => selectedVariant && addToCart(selectedProduct, selectedVariant)}
                disabled={!selectedVariant}
              >
                Добавить в корзину
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}