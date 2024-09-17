import { getExpenses, getCategories, getIncome, deleteExpense, deleteCategory, deleteIncome } from './db.js';

export function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add('active');
}

export async function updateUI() {
    const expenses = await getExpenses();
    const categories = await getCategories();
    const income = await getIncome();

    updateBudgetOverview(expenses, income);
    updateExpenseChart(expenses, income);
    updateRecentExpenses(expenses, categories);
    updateFixedExpensesList(expenses, categories);
    updateCategoriesList(categories);
    updateIncomeList(income);
    updateCategorySelects(categories);
}

function updateBudgetOverview(expenses, income) {
    const totalIncome = income.reduce((sum, inc) => sum + parseFloat(inc.amount), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const remainingBudget = totalIncome - totalExpenses;

    const overviewHTML = `
        <h2>Aperçu du budget</h2>
        <p><strong>Revenu total:</strong> ${totalIncome.toFixed(2)} €</p>
        <p><strong>Dépenses totales:</strong> ${totalExpenses.toFixed(2)} €</p>
        <p><strong>Budget restant:</strong> ${remainingBudget.toFixed(2)} €</p>
    `;

    document.getElementById('budget-overview').innerHTML = overviewHTML;
}

function updateExpenseChart(expenses, income) {
    const totalIncome = income.reduce((sum, inc) => sum + parseFloat(inc.amount), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const remainingBudget = totalIncome - totalExpenses;

    const ctx = document.getElementById('expense-chart').getContext('2d');
    
    if (window.expenseChart) {
        window.expenseChart.destroy();
    }
    
    window.expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Dépenses', 'Budget restant'],
            datasets: [{
                data: [totalExpenses, remainingBudget],
                backgroundColor: ['#e74c3c', '#2ecc71'],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                title: {
                    display: true,
                    text: 'Répartition du budget',
                    font: {
                        size: 18
                    }
                }
            },
            cutout: '70%',
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });
}

function updateRecentExpenses(expenses, categories) {
    const recentExpenses = expenses
        .filter(exp => exp.type === 'variable')
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    const expensesHTML = recentExpenses.map(exp => {
        const category = categories.find(cat => cat.name === exp.category);
        const categoryTag = `<span class="category-tag" style="background-color: ${category ? category.color : '#000000'}">${exp.category}</span>`;

        return `
            <div class="expense-item">
                <p><strong>${exp.description}</strong> - ${parseFloat(exp.amount).toFixed(2)} € ${categoryTag}</p>
                <p>Date: ${new Date(exp.date).toLocaleDateString()}</p>
                <button class="delete-button" onclick="deleteExpense(${exp.id})">Supprimer</button>
            </div>
        `;
    }).join('');

    document.getElementById('recent-expenses').innerHTML = `
        <h2>Dépenses variables récentes</h2>
        ${expensesHTML || '<p>Aucune dépense récente</p>'}
    `;
}

function updateFixedExpensesList(expenses, categories) {
    const fixedExpenses = expenses.filter(exp => exp.type === 'fixed');

    const expensesHTML = fixedExpenses.map(exp => {
        let dateInfo = '';
        if (exp.frequency === 'monthly') {
            dateInfo = `Chaque mois le ${exp.date1}`;
        } else if (exp.frequency === 'bimonthly') {
            dateInfo = `Deux fois par mois les ${exp.date1} et ${exp.date2}`;
        }
        
        const category = categories.find(cat => cat.name === exp.category);
        const categoryTag = `<span class="category-tag" style="background-color: ${category ? category.color : '#000000'}">${exp.category}</span>`;

        return `
            <div class="expense-item">
                <p><strong>${exp.description}</strong> - ${parseFloat(exp.amount).toFixed(2)} € ${categoryTag}</p>
                <p>Fréquence: ${exp.frequency === 'monthly' ? 'Mensuel' : 'Bimensuel'}</p>
                <p>${dateInfo}</p>
                <button class="delete-button" onclick="deleteExpense(${exp.id})">Supprimer</button>
            </div>
        `;
    }).join('');

    document.getElementById('fixed-expenses-list').innerHTML = `
        <h2>Dépenses fixes</h2>
        ${expensesHTML || '<p>Aucune dépense fixe</p>'}
    `;
}

function updateCategoriesList(categories) {
    const categoriesHTML = categories.map(cat => `
        <div class="category-item">
            <span class="category-tag" style="background-color: ${cat.color}">${cat.name}</span>
            <button class="delete-button" onclick="deleteCategory(${cat.id})">Supprimer</button>
        </div>
    `).join('');

    document.getElementById('categories-list').innerHTML = `
        <h2>Catégories de dépenses</h2>
        ${categoriesHTML || '<p>Aucune catégorie</p>'}
    `;
}

function updateIncomeList(income) {
    const incomeHTML = income.map(inc => `
        <div class="income-item">
            <p><strong>${inc.description}</strong> - ${parseFloat(inc.amount).toFixed(2)} €</p>
            <p>Date: ${new Date(inc.date).toLocaleDateString()}</p>
            ${inc.isRecurring ? `<p>Récurrent: Chaque mois le ${inc.day}</p>` : ''}
            <button class="delete-button" onclick="deleteIncome(${inc.id})">Supprimer</button>
        </div>
    `).join('');

    document.getElementById('income-list').innerHTML = `
        <h2>Sources de revenus</h2>
        ${incomeHTML || '<p>Aucune source de revenu</p>'}
    `;
}

function updateCategorySelects(categories) {
    const categoryOptions = categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('');
    document.getElementById('quick-expense-category').innerHTML = `<option value="" disabled selected>Choisir une catégorie</option>${categoryOptions}`;
    document.getElementById('expense-category').innerHTML = `<option value="" disabled selected>Choisir une catégorie</option>${categoryOptions}`;
}

window.deleteExpense = async (id) => {
    await deleteExpense(id);
    updateUI();
};

window.deleteCategory = async (id) => {
    await deleteCategory(id);
    updateUI();
};

window.deleteIncome = async (id) => {
    await deleteIncome(id);
    updateUI();
};
