let db;

export async function initDB() {
    // Cette fonction reste mais ne fait plus rien car on utilise SQLite
    return;
}

export async function addExpense(amount, description, category, type, date, frequency = null, date1 = null, date2 = null) {
    const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            amount, description, category, type, date, frequency, date1, date2
        }),
    });
    if (!response.ok) throw new Error('Erreur lors de l\'ajout de la dépense');
}

export async function getExpenses() {
    const response = await fetch('/api/expenses');
    if (!response.ok) throw new Error('Erreur lors de la récupération des dépenses');
    return await response.json();
}

export async function addCategory(name, color) {
    const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, color }),
    });
    
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de l\'ajout de la catégorie');
    }
    return data;
}

export async function getCategories() {
    const response = await fetch('/api/categories');
    if (!response.ok) throw new Error('Erreur lors de la récupération des catégories');
    return await response.json();
}

export async function deleteCategory(id) {
    const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE'
    });
    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur lors de la suppression de la catégorie');
    }
}

export async function addIncome({ amount, description, date, is_recurring, frequency, day }) {
    const response = await fetch('/api/income', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            amount,
            description,
            date,
            is_recurring,
            frequency,
            day
        }),
    });
    if (!response.ok) throw new Error('Erreur lors de l\'ajout du revenu');
}

export async function getIncome() {
    const response = await fetch('/api/income');
    if (!response.ok) throw new Error('Erreur lors de la récupération des revenus');
    return await response.json();
}

export async function deleteIncome(id) {
    const response = await fetch(`/api/income/${id}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Erreur lors de la suppression du revenu');
}

export async function deleteExpense(id) {
    const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur lors de la suppression de la dépense');
    }
}

export async function updateExpense(expense) {
    try {
        const response = await fetch(`/api/expenses/${expense.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: expense.id,
                description: expense.description,
                amount: expense.amount,
                category: expense.category,
                frequency: expense.frequency,
                date1: expense.date1,
                date2: expense.date2,
                type: expense.type  // S'assurer que le type est inclus
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Erreur lors de la mise à jour de la dépense');
        }

        return await response.json();
    } catch (error) {
        console.error('Erreur détaillée:', error);
        throw error;
    }
}

export async function updateIncome(income) {
    const response = await fetch(`/api/income/${income.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(income)
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erreur lors de la mise à jour du revenu');
    }
}
