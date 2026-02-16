// frontend/lib/aboutApi.ts
export interface GalleryImage {
  id: number;
  image: string; // URL уже полный от Django
  caption: string;
  show_caption: boolean;
  display_order: number;
}

export interface Gallery {
  id: number;
  title: string;
  description: string;
  show_title: boolean;
  show_description: boolean;
  is_visible: boolean;
  display_order: number;
  images: GalleryImage[];
}

export interface AboutPageData {
  id: number;
  title: string;
  main_image: string | null;
  show_main_image: boolean;
  main_text: string;
  show_main_text: boolean;
  is_active: boolean;
  galleries: Gallery[];
}

export async function getAboutData(): Promise<AboutPageData> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  
  try {
    const response = await fetch(`${apiUrl}/about/about/`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data; // Просто возвращаем данные как есть
  } catch (error) {
    console.error('Error fetching about page data:', error);
    return getEmptyData();
  }
}

function getEmptyData(): AboutPageData {
  return {
    id: 0,
    title: 'О нас',
    main_image: null,
    show_main_image: true,
    main_text: '',
    show_main_text: true,
    is_active: true,
    galleries: []
  };
}

export function getImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;

  const djangoUrl = process.env.NEXT_PUBLIC_DJANGO_URL || 'http://localhost:8000';

  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  return imagePath.startsWith('/')
    ? `${djangoUrl}${imagePath}`
    : `${djangoUrl}/${imagePath}`;
}