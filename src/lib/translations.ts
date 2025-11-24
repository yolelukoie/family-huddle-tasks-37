import type { TFunction } from 'i18next';

/**
 * Translates default category names to their localized versions
 */
export function translateCategoryName(categoryName: string, t: TFunction): string {
  const categoryMap: Record<string, string> = {
    'House Chores': t('defaultCategories.houseChores'),
    'Personal Growth': t('defaultCategories.personalGrowth'),
    'Happiness': t('defaultCategories.happiness'),
  };

  return categoryMap[categoryName] || categoryName;
}

/**
 * Translates default task names to their localized versions
 */
export function translateTaskName(taskName: string, t: TFunction): string {
  const taskMap: Record<string, string> = {
    'Clean the room': t('defaultTasks.cleanTheRoom'),
    'Do the dishes': t('defaultTasks.doTheDishes'),
    'Take out trash': t('defaultTasks.takeOutTrash'),
    'Cook meal': t('defaultTasks.cookMeal'),
  };

  return taskMap[taskName] || taskName;
}
