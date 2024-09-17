let db;

export async function initDB() {
    db = await idb.openDB('budgetDB', 1, {
        upgrade(db) {
            db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
            db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
            db.createObjectStore('income', { keyPath: 'id', autoIncrement: true });
        },
    });
}

export async function addExpense(amount, description, category, type, date, frequency = null, date1 = null, date2 = null) {
    if (type === 'fixed') {
        const dateObj = new Date(date);
        if (frequency === 'monthly') {
            date1 = dateObj.getDate().toString();
        } else if (frequency === 'bimonthly') {
            date1 = dateObj.getDate().toString();
            // For bimonthly, we'll use the same day for both dates initially
            date2 = date1;
        }
    }
    await db.add('expenses', { amount, description, category, type, date, frequency, date1, date2 });
}

export async function getExpenses() {
    return await db.getAll('expenses');
}

export async function addCategory(name, color) {
    await db.add('categories', { name, color });
}

export async function getCategories() {
    return await db.getAll('categories');
}

export async function addIncome(amount, description, date, isRecurring = false, frequency = 'monthly') {
    const dateObj = new Date(date);
    const day = dateObj.getDate().toString();
    await db.add('income', { amount, description, date, isRecurring, frequency, day });
}

export async function getIncome() {
    return await db.getAll('income');
}

export async function deleteExpense(id) {
    await db.delete('expenses', id);
}

export async function deleteCategory(id) {
    await db.delete('categories', id);
}

export async function deleteIncome(id) {
    await db.delete('income', id);
}
