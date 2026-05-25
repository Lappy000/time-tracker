import { useState, useEffect, useCallback } from 'react';
import { useIpc } from './useIpc';

// Define Category type locally to avoid importing from electron
export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string | null;
  is_productive: boolean;
  productivity_score: number;
  is_default: boolean;
  created_at: string;
}

export interface CategoryInput {
  name: string;
  color: string;
  icon: string | null;
  is_productive: boolean;
  productivity_score: number;
  is_default?: boolean;
}

export interface CategoryWithStats extends Category {
  app_count?: number;
  total_duration?: number; // Duration in seconds
}

// Backwards compatibility alias
export type CategoryWithAppCount = CategoryWithStats;

export function useCategories() {
  const { invoke, channels } = useIpc();
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<Category[]>(channels.CATEGORIES.GET_ALL);
      if (result.success && result.data) {
        setCategories(result.data);
      } else {
        setError(result.error || 'Failed to fetch categories');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [invoke, channels]);

  // Fetch categories with usage stats (time spent and app count)
  const fetchCategoriesWithStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<CategoryWithStats[]>(channels.CATEGORIES.GET_WITH_STATS);
      if (result.success && result.data) {
        setCategories(result.data);
      } else {
        setError(result.error || 'Failed to fetch categories with stats');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [invoke, channels]);

  const createCategory = useCallback(async (category: CategoryInput): Promise<Category | null> => {
    try {
      const result = await invoke<Category>(channels.CATEGORIES.CREATE, {
        ...category,
        is_default: category.is_default ?? false
      });
      if (result.success && result.data) {
        await fetchCategories();
        return result.data;
      } else {
        setError(result.error || 'Failed to create category');
        return null;
      }
    } catch (err) {
      setError(String(err));
      return null;
    }
  }, [invoke, channels, fetchCategories]);

  const updateCategory = useCallback(async (
    id: number, 
    updates: Partial<CategoryInput>
  ): Promise<Category | null> => {
    try {
      const result = await invoke<Category>(channels.CATEGORIES.UPDATE, id, updates);
      if (result.success && result.data) {
        await fetchCategories();
        return result.data;
      } else {
        setError(result.error || 'Failed to update category');
        return null;
      }
    } catch (err) {
      setError(String(err));
      return null;
    }
  }, [invoke, channels, fetchCategories]);

  const deleteCategory = useCallback(async (id: number): Promise<boolean> => {
    try {
      const result = await invoke(channels.CATEGORIES.DELETE, id);
      if (result.success) {
        await fetchCategories();
        return true;
      } else {
        setError(result.error || 'Failed to delete category');
        return false;
      }
    } catch (err) {
      setError(String(err));
      return false;
    }
  }, [invoke, channels, fetchCategories]);

  const getCategoryById = useCallback((id: number): CategoryWithStats | undefined => {
    return categories.find(c => c.id === id);
  }, [categories]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    fetchCategories,
    fetchCategoriesWithStats,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    clearError: () => setError(null)
  };
}

// Helper to format duration in seconds to human readable string
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return '0m';
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours === 0) {
    return `${minutes}m`;
  }
  
  if (minutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${minutes}m`;
}

// Productivity type helper
export type ProductivityType = 'productive' | 'neutral' | 'distracting';

export function getProductivityType(score: number): ProductivityType {
  if (score > 0) return 'productive';
  if (score < 0) return 'distracting';
  return 'neutral';
}

export function getProductivityLabel(score: number): string {
  const type = getProductivityType(score);
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function getProductivityColor(score: number): string {
  const type = getProductivityType(score);
  switch (type) {
    case 'productive': return 'text-productive';
    case 'distracting': return 'text-distraction';
    default: return 'text-neutral';
  }
}