type MonthlyBudgetInput = {
  categoryId: string | null;
  amount: number;
};

type BudgetCategoryInput = {
  id: string;
  defaultBudget: number | null;
};

export function calculateEffectiveMonthlyBudget(
  categories: BudgetCategoryInput[],
  budgets: MonthlyBudgetInput[],
  defaultExpenseBudget?: number | null
) {
  const totalBudget = budgets.find((budget) => budget.categoryId == null);
  if (totalBudget) return totalBudget.amount;
  if (defaultExpenseBudget != null && defaultExpenseBudget > 0) return defaultExpenseBudget;

  const budgetByCategory = new Map(
    budgets
      .filter((budget) => budget.categoryId != null)
      .map((budget) => [budget.categoryId!, budget.amount])
  );

  return categories.reduce((sum, category) => {
    const monthlyBudget = budgetByCategory.get(category.id);
    return sum + (monthlyBudget ?? category.defaultBudget ?? 0);
  }, 0);
}
