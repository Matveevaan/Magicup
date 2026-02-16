// frontend/app/lib/menuApi.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const MENU_API_URL = `${API_URL}/menu`;
// Простые типы
export interface ProductVariant {
  id: number;
  volume_name: string;
  volume_value: string;
  price: string;
  calories: number | null;
  is_available: boolean;
  is_default: boolean;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  group: number;
  group_name: string;
  menu_type: string; // drinks, desserts, sandwiches
  menu_type_display: string; // Напитки, Десерты, Сэндвичи
  short_description: string;
  min_price: number;
  image_url: string | null;
  is_available: boolean;
  is_featured: boolean;
  variants: ProductVariant[];
}

export interface ProductGroup {
  id: number;
  name: string;
  slug: string;
  menu_type: string;
  menu_type_display: string;
  description: string;
  display_order: number;
}

// Простые функции
function getImageUrl(image: string | null): string | null {
  if (!image) return null;
  
  // Если уже полный URL
  if (image.startsWith('http')) return image;
  
  // Если начинается с /
  if (image.startsWith('/')) {
    const base = process.env.NEXT_PUBLIC_DJANGO_URL || 'http://localhost:8000';
    return base + image;
  }
  
  // Медиа файл
  const mediaUrl = process.env.NEXT_PUBLIC_MEDIA_URL || `${process.env.NEXT_PUBLIC_DJANGO_URL || 'http://localhost:8000'}/media`;
  return `${mediaUrl}/${image}`;
}

// Простой API
export const menuApi = {
  // Получить все товары
  async getProducts(params?: {
    group?: string;
    menu_type?: string;
    featured?: boolean;
  }): Promise<Product[]> {
    try {
      let url = `${MENU_API_URL}/products/`;
      const query = new URLSearchParams();
      
      if (params?.group) query.append('group', params.group);
      if (params?.menu_type) query.append('menu_type', params.menu_type);
      if (params?.featured) query.append('is_featured', 'true');
      
      const queryString = query.toString();
      if (queryString) url += `?${queryString}`;
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      
      if (!response.ok) return [];
      
      const data = await response.json();
      const products = Array.isArray(data) ? data : data.results || data.products || [];
      
      return products.map((product: any) => ({
        ...product,
        image_url: product.image_url || getImageUrl(product.image)
      }));
    } catch {
      return [];
    }
  },
  
  // Получить все группы
  async getGroups(): Promise<ProductGroup[]> {
    try {
      const response = await fetch(`${MENU_API_URL}/groups/`, {
        credentials: 'include'
      });
      if (!response.ok) return [];
      
      const data = await response.json();
      return Array.isArray(data) ? data : data.results || data.groups || [];
    } catch {
      return [];
    }
  },
  
  // Получить товар по slug
  async getProduct(slug: string): Promise<Product | null> {
    try {
      const response = await fetch(`${MENU_API_URL}/products/${slug}/`, {
        credentials: 'include'
      });
      if (!response.ok) return null;
      
      const product = await response.json();
      return {
        ...product,
        image_url: product.image_url || getImageUrl(product.image)
      };
    } catch {
      return null;
    }
  },
  
  // Получить группу по slug
  async getGroup(slug: string): Promise<ProductGroup | null> {
    try {
      const response = await fetch(`${MENU_API_URL}/groups/${slug}/`, {
        credentials: 'include'
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  },
  
  // Получить полное меню
  async getMenu(): Promise<Array<{
    menu_type: string;
    menu_type_display: string;
    groups: ProductGroup[];
  }>> {
    try {
      const response = await fetch(`${MENU_API_URL}/`, {
        credentials: 'include'
      });
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.menu || data || [];
    } catch {
      return [];
    }
  },
  
  // Получить рекомендуемые товары
  async getFeatured(): Promise<Product[]> {
    return this.getProducts({ featured: true });
  },
  
  // ИСПРАВЛЕНО: Поиск товаров
  async search(query: string): Promise<Product[]> {
    try {
      if (!query || query.length < 2) return [];
      
      // Используем правильный URL: /api/menu/search/?q=...
      const response = await fetch(`${MENU_API_URL}/search/?q=${encodeURIComponent(query)}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.log('Search response not OK:', response.status);
        return [];
      }
      
      const data = await response.json();
      console.log('Search results:', data);
      
      // API возвращает { results: [...], query: "..." }
      const products = data.results || [];
      
      return products.map((product: any) => ({
        ...product,
        image_url: product.image_url || getImageUrl(product.image)
      }));
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  },
  
  // Получить товары по типу меню
  async getByMenuType(menuType: 'drinks' | 'desserts' | 'sandwiches'): Promise<Product[]> {
    try {
      const response = await fetch(`${MENU_API_URL}/menu/${menuType}/`, {
        credentials: 'include'
      });
      if (!response.ok) return [];
      
      const data = await response.json();
      // API возвращает { menu_type, menu_type_display, groups, products }
      return data.products || [];
    } catch {
      return [];
    }
  }
};

// Вспомогательные функции (без изменений)
export function formatPrice(price: string | number): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '— ₽';
  return `${num.toFixed(2).replace(/\.00$/, '')} ₽`;
}

export function getDefaultVariant(product: Product): ProductVariant | null {
  if (!product?.variants?.length) return null;
  return product.variants.find(v => v.is_default) || product.variants[0];
}

export function getProductPrice(product: Product): string {
  const variant = getDefaultVariant(product);
  return variant ? formatPrice(variant.price) : '— ₽';
}