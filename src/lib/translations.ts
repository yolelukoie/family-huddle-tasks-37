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

/**
 * Translates default task descriptions to their localized versions
 */
export function translateTaskDescription(description: string | null | undefined, t: TFunction): string | null {
  if (!description) return null;
  
  const descriptionMap: Record<string, string> = {
    'Tidy up and organize the room': t('defaultTasks.cleanTheRoomDesc'),
    'Wash, dry, and put away dishes': t('defaultTasks.doTheDishesDesc'),
    'Collect and take out household trash': t('defaultTasks.takeOutTrashDesc'),
    'Help prepare or cook a meal': t('defaultTasks.cookMealDesc'),
  };

  return descriptionMap[description] || description;
}
