import { getExpenses, getCategories, getIncome, deleteExpense, deleteCategory, deleteIncome, updateExpense } from './db.js';

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
    initializeCategoryColors();
}

const CATEGORY_COLORS = [
    '#007AFF', // Bleu iOS
    '#34C759', // Vert iOS
    '#FF3B30', // Rouge iOS
    '#FF9500', // Orange iOS
    '#5856D6', // Violet iOS
    '#FF2D55', // Rose iOS
    '#5AC8FA', // Bleu clair iOS
    '#FFCC00', // Jaune iOS
    '#4CD964', // Vert printemps iOS
    '#FF6B22', // Orange corail iOS
    '#64D2FF', // Bleu azur iOS
    '#FF375F', // Rose vif iOS
];

function initializeCategoryColors() {
    const colorSelector = document.getElementById('color-selector');
    if (!colorSelector) return;

    colorSelector.innerHTML = CATEGORY_COLORS.map(color => `
        <div class="color-option" 
             style="background-color: ${color}" 
             data-color="${color}"
             role="button"
             aria-label="Sélectionner la couleur ${color}">
        </div>
    `).join('');

    // Sélectionner la première couleur par défaut
    const firstColor = colorSelector.querySelector('.color-option');
    if (firstColor) {
        firstColor.classList.add('selected');
        document.getElementById('category-color').value = CATEGORY_COLORS[0];
    }

    colorSelector.addEventListener('click', (e) => {
        if (e.target.classList.contains('color-option')) {
            // Retirer la sélection précédente
            colorSelector.querySelectorAll('.color-option').forEach(opt => 
                opt.classList.remove('selected'));
            
            // Ajouter la nouvelle sélection
            e.target.classList.add('selected');
            document.getElementById('category-color').value = e.target.dataset.color;
        }
    });
}

function updateBudgetOverview(expenses, income) {
    // Séparer les dépenses fixes et variables
    const variableExpenses = expenses.filter(exp => exp.type === 'variable');
    const fixedExpenses = expenses.filter(exp => exp.type === 'fixed');
    
    // Calculer le total des revenus
    const totalIncome = income.reduce((sum, inc) => sum + parseFloat(inc.amount), 0);
    
    // Calculer séparément les dépenses fixes et variables
    const totalVariableExpenses = variableExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const totalFixedExpenses = fixedExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    
    // Calculer le budget restant
    const remainingBudget = totalIncome - (totalVariableExpenses + totalFixedExpenses);

    const overviewHTML = `
        <h2>Aperçu du budget</h2>
        <p><strong>Revenu total:</strong> ${totalIncome.toFixed(2)} €</p>
        <p><strong>Dépenses fixes:</strong> ${totalFixedExpenses.toFixed(2)} €</p>
        <p><strong>Dépenses variables:</strong> ${totalVariableExpenses.toFixed(2)} €</p>
        <p><strong>Total des dépenses:</strong> ${(totalVariableExpenses + totalFixedExpenses).toFixed(2)} €</p>
        <p class="remaining-budget"><strong>Budget restant:</strong> ${remainingBudget.toFixed(2)} €</p>
    `;

    document.getElementById('budget-overview').innerHTML = overviewHTML;
}

function updateExpenseChart(expenses, income) {
    // Utiliser la même logique de séparation des dépenses
    const variableExpenses = expenses.filter(exp => exp.type === 'variable');
    const fixedExpenses = expenses.filter(exp => exp.type === 'fixed');
    
    const totalIncome = income.reduce((sum, inc) => sum + parseFloat(inc.amount), 0);
    const totalVariableExpenses = variableExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const totalFixedExpenses = fixedExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const remainingBudget = totalIncome - (totalVariableExpenses + totalFixedExpenses);

    const ctx = document.getElementById('expense-chart').getContext('2d');
    
    if (window.expenseChart) {
        window.expenseChart.destroy();
    }
    
    window.expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Dépenses fixes', 'Dépenses variables', 'Budget restant'],
            datasets: [{
                data: [totalFixedExpenses, totalVariableExpenses, remainingBudget],
                backgroundColor: ['#5856D6', '#FF9500', '#34C759'],
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

    const recentExpensesContainer = document.getElementById('recent-expenses');
    
    const tableHTML = `
        <h2>Dépenses variables récentes</h2>
        ${recentExpenses.length ? `
        <table class="expenses-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Montant</th>
                    <th>Catégorie</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${recentExpenses.map(exp => {
                    const category = categories.find(cat => cat.name === exp.category);
                    
                    return `
                    <tr data-id="${exp.id}" class="expense-row">
                        <td>${exp.description}</td>
                        <td>${parseFloat(exp.amount).toFixed(2)} €</td>
                        <td>
                            <span class="category-tag" style="background-color: ${category ? category.color : '#000000'}">
                                ${exp.category}
                            </span>
                        </td>
                        <td>${new Date(exp.date).toLocaleDateString()}</td>
                        <td class="table-actions">
                            <div class="edit-button" title="Modifier">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </div>
                            <div class="delete-icon" title="Supprimer">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 6L6 18M6 6l12 12"></path>
                                </svg>
                            </div>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
        ` : '<p>Aucune dépense récente</p>'}
    `;

    const listHTML = `
        <h2>Dépenses variables récentes</h2>
        ${recentExpenses.length ? `
        <div class="expenses-list">
            ${recentExpenses.map(exp => {
                const category = categories.find(cat => cat.name === exp.category);
                
                return `
                <div data-id="${exp.id}" class="expenses-list-item">
                    <div class="item-header">${exp.description}</div>
                    <div class="item-content">
                        <span>${parseFloat(exp.amount).toFixed(2)} €</span>
                        <span class="category-tag" style="background-color: ${category ? category.color : '#000000'}">
                            ${exp.category}
                        </span>
                        <span>${new Date(exp.date).toLocaleDateString()}</span>
                        <div class="item-actions">
                            <div class="edit-button" title="Modifier">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </div>
                            <div class="delete-icon" title="Supprimer">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 6L6 18M6 6l12 12"></path>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>`;
            }).join('')}
        </div>
        ` : '<p>Aucune dépense récente</p>'}
    `;

    recentExpensesContainer.querySelector('.expenses-table-container').innerHTML = tableHTML;
    recentExpensesContainer.querySelector('.expenses-list-container').innerHTML = listHTML;

    // Ajouter les écouteurs d'événements
    recentExpensesContainer.querySelectorAll('.delete-icon').forEach(icon => {
        icon.addEventListener('click', async (e) => {
            const row = e.currentTarget.closest('[data-id]');
            const expenseId = row.dataset.id;
            if (expenseId && confirm('Voulez-vous vraiment supprimer cette dépense ?')) {
                try {
                    await deleteExpense(parseInt(expenseId));
                    await updateUI();
                } catch (error) {
                    alert('Erreur lors de la suppression de la dépense');
                    console.error(error);
                }
            }
        });
    });

    recentExpensesContainer.querySelectorAll('.edit-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const row = e.currentTarget.closest('[data-id]');
            const expense = recentExpenses.find(exp => exp.id === parseInt(row.dataset.id));
            if (expense) {
                convertVariableExpenseRowToForm(row, expense, categories);
            }
        });
    });
}

function convertVariableExpenseRowToForm(row, expense, categories) {
    const categoryOptions = categories.map(cat => 
        `<option value="${cat.name}" ${cat.name === expense.category ? 'selected' : ''}>${cat.name}</option>`
    ).join('');

    const formHTML = `
        <tr class="expense-edit-form">
            <td><input type="text" value="${expense.description}" name="description" required></td>
            <td>
                <div class="input-group">
                    <input type="number" step="0.01" value="${expense.amount}" name="amount" required>
                    <span class="currency-symbol">€</span>
                </div>
            </td>
            <td><select name="category" required>${categoryOptions}</select></td>
            <td><input type="date" name="date" value="${expense.date}" required></td>
            <td>
                <button type="button" class="save-button">Enregistrer</button>
                <button type="button" class="cancel-button">Annuler</button>
            </td>
        </tr>
    `;

    row.outerHTML = formHTML;
    const form = document.querySelector('.expense-edit-form');

    // Gérer la sauvegarde
    form.querySelector('.save-button').addEventListener('click', async () => {
        try {
            const updatedExpense = {
                id: expense.id,
                description: form.querySelector('[name="description"]').value,
                amount: parseFloat(form.querySelector('[name="amount"]').value),
                category: form.querySelector('[name="category"]').value,
                date: form.querySelector('[name="date"]').value,
                type: 'variable'
            };

            await updateExpense(updatedExpense);
            await updateUI();
        } catch (error) {
            alert(error.message || 'Erreur lors de la mise à jour de la dépense');
            console.error('Erreur détaillée:', error);
        }
    });

    // Gérer l'annulation
    form.querySelector('.cancel-button').addEventListener('click', () => {
        updateUI();
    });
}

function updateFixedExpensesList(expenses, categories) {
    const fixedExpenses = expenses.filter(exp => exp.type === 'fixed');
    const fixedExpensesContainer = document.getElementById('fixed-expenses-list');

    const tableHTML = `
        <h2>Dépenses fixes</h2>
        ${fixedExpenses.length ? `
        <table class="expenses-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Montant</th>
                    <th>Catégorie</th>
                    <th>Fréquence</th>
                    <th>Date(s)</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${fixedExpenses.map(exp => {
                    const category = categories.find(cat => cat.name === exp.category);
                    const dateInfo = exp.frequency === 'monthly' 
                        ? `Le ${exp.date1} de chaque mois`
                        : `Les ${exp.date1} et ${exp.date2} de chaque mois`;
                    
                    return `
                    <tr data-id="${exp.id}" class="expense-row">
                        <td>${exp.description}</td>
                        <td>${parseFloat(exp.amount).toFixed(2)} €</td>
                        <td>
                            <span class="category-tag" style="background-color: ${category ? category.color : '#000000'}">
                                ${exp.category}
                            </span>
                        </td>
                        <td>${exp.frequency === 'monthly' ? 'Mensuel' : 'Bimensuel'}</td>
                        <td>${dateInfo}</td>
                        <td class="table-actions">
                            <div class="edit-button" title="Modifier">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </div>
                            <div class="delete-icon" title="Supprimer">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 6L6 18M6 6l12 12"></path>
                                </svg>
                            </div>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
        ` : '<p>Aucune dépense fixe</p>'}
    `;

    fixedExpensesContainer.innerHTML = tableHTML;

    // Ajouter les écouteurs d'événements
    fixedExpensesContainer.querySelectorAll('.delete-icon').forEach(icon => {
        icon.addEventListener('click', async (e) => {
            const row = e.currentTarget.closest('tr');
            const expenseId = row.dataset.id;
            if (expenseId && confirm('Voulez-vous vraiment supprimer cette dépense ?')) {
                try {
                    await deleteExpense(parseInt(expenseId));
                    await updateUI();
                } catch (error) {
                    alert('Erreur lors de la suppression de la dépense');
                    console.error(error);
                }
            }
        });
    });

    fixedExpensesContainer.querySelectorAll('.edit-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const row = e.currentTarget.closest('tr');
            const expense = fixedExpenses.find(exp => exp.id === parseInt(row.dataset.id));
            if (expense) {
                convertRowToForm(row, expense, categories);
            }
        });
    });
}

function convertRowToForm(row, expense, categories) {
    const categoryOptions = categories.map(cat => 
        `<option value="${cat.name}" ${cat.name === expense.category ? 'selected' : ''}>${cat.name}</option>`
    ).join('');

    const formHTML = `
        <tr class="expense-edit-form">
            <td><input type="text" value="${expense.description}" name="description" required></td>
            <td><input type="number" step="0.01" value="${expense.amount}" name="amount" required></td>
            <td><select name="category" required>${categoryOptions}</select></td>
            <td>
                <select name="frequency" required>
                    <option value="monthly" ${expense.frequency === 'monthly' ? 'selected' : ''}>Mensuel</option>
                    <option value="bimonthly" ${expense.frequency === 'bimonthly' ? 'selected' : ''}>Bimensuel</option>
                </select>
            </td>
            <td>
                <input type="number" min="1" max="31" value="${expense.date1}" name="date1" required>
                ${expense.frequency === 'bimonthly' ? 
                    `<input type="number" min="1" max="31" value="${expense.date2 || expense.date1}" name="date2" required>` : 
                    ''}
            </td>
            <td>
                <button type="button" class="save-button">Enregistrer</button>
                <button type="button" class="cancel-button">Annuler</button>
            </td>
        </tr>
    `;

    row.outerHTML = formHTML;
    const form = document.querySelector('.expense-edit-form');

    // Gérer la fréquence
    const frequencySelect = form.querySelector('[name="frequency"]');
    frequencySelect.addEventListener('change', (e) => {
        const date2Container = form.querySelector('[name="date2"]');
        if (e.target.value === 'bimonthly' && !date2Container) {
            const dateCell = form.querySelector('td:nth-child(5)');
            dateCell.innerHTML += `<input type="number" min="1" max="31" value="${expense.date1}" name="date2" required>`;
        } else if (e.target.value === 'monthly') {
            form.querySelector('[name="date2"]')?.remove();
        }
    });

    // Gérer la sauvegarde
    form.querySelector('.save-button').addEventListener('click', async () => {
        try {
            const updatedExpense = {
                id: expense.id,
                description: form.querySelector('[name="description"]').value,
                amount: parseFloat(form.querySelector('[name="amount"]').value),
                category: form.querySelector('[name="category"]').value,
                frequency: form.querySelector('[name="frequency"]').value,
                date1: form.querySelector('[name="date1"]').value,
                date2: form.querySelector('[name="date2"]')?.value,
                type: 'fixed'  // Conserver le type fixe
            };

            await updateExpense(updatedExpense);
            await updateUI();
        } catch (error) {
            alert(error.message || 'Erreur lors de la mise à jour de la dépense');
            console.error('Erreur détaillée:', error);
        }
    });

    // Gérer l'annulation
    form.querySelector('.cancel-button').addEventListener('click', () => {
        updateUI();
    });
}

function updateCategoriesList(categories) {
    const categoriesList = document.getElementById('categories-list');
    if (!categoriesList) return;

    categoriesList.innerHTML = categories.map(category => `
        <div class="category-card" data-id="${category.id}">
            <div class="category-info">
                <div class="color-preview" style="background-color: ${category.color}"></div>
                <span>${category.name}</span>
            </div>
            <div class="delete-icon" role="button" title="Supprimer la catégorie">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"></path>
                </svg>
            </div>
        </div>
    `).join('');

    // Ajouter les écouteurs d'événements pour chaque bouton de suppression
    categoriesList.querySelectorAll('.delete-icon').forEach(icon => {
        icon.addEventListener('click', async (e) => {
            const categoryCard = e.currentTarget.closest('.category-card');
            const categoryId = categoryCard.dataset.id;
            if (categoryId) {
                try {
                    await deleteCategory(parseInt(categoryId));
                    await updateUI();
                } catch (error) {
                    alert(error.message);
                }
            }
        });
    });
}

function updateIncomeList(income) {
    const incomeContainer = document.getElementById('income-list');

    const tableHTML = `
        <h2>Sources de revenus</h2>
        ${income.length ? `
        <table class="expenses-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Montant</th>
                    <th>Type</th>
                    <th>Date(s)</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${income.map(inc => {
                    const dateInfo = inc.is_recurring 
                        ? `Le ${inc.day} de chaque mois`
                        : new Date(inc.date).toLocaleDateString();
                    
                    return `
                    <tr data-id="${inc.id}" class="income-row">
                        <td>${inc.description}</td>
                        <td>${parseFloat(inc.amount).toFixed(2)} €</td>
                        <td>${inc.is_recurring ? 'Mensuel' : 'Occasionnel'}</td>
                        <td>${dateInfo}</td>
                        <td class="table-actions">
                            <div class="edit-button" title="Modifier">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </div>
                            <div class="delete-icon" title="Supprimer">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 6L6 18M6 6l12 12"></path>
                                </svg>
                            </div>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
        ` : '<p>Aucune source de revenu</p>'}
    `;

    incomeContainer.innerHTML = tableHTML;

    // Ajouter les écouteurs d'événements
    incomeContainer.querySelectorAll('.delete-icon').forEach(icon => {
        icon.addEventListener('click', async (e) => {
            const row = e.currentTarget.closest('tr');
            const incomeId = row.dataset.id;
            if (incomeId && confirm('Voulez-vous vraiment supprimer ce revenu ?')) {
                try {
                    await deleteIncome(parseInt(incomeId));
                    await updateUI();
                } catch (error) {
                    alert('Erreur lors de la suppression du revenu');
                    console.error(error);
                }
            }
        });
    });

    incomeContainer.querySelectorAll('.edit-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const row = e.currentTarget.closest('tr');
            const incomeItem = income.find(inc => inc.id === parseInt(row.dataset.id));
            if (incomeItem) {
                convertIncomeRowToForm(row, incomeItem);
            }
        });
    });
}

function convertIncomeRowToForm(row, income) {
    const formHTML = `
        <tr class="income-edit-form">
            <td><input type="text" value="${income.description}" name="description" required></td>
            <td>
                <div class="input-group">
                    <input type="number" step="0.01" value="${income.amount}" name="amount" required>
                    <span class="currency-symbol">€</span>
                </div>
            </td>
            <td>
                <select name="type" required>
                    <option value="one-time" ${!income.is_recurring ? 'selected' : ''}>Occasionnel</option>
                    <option value="monthly" ${income.is_recurring ? 'selected' : ''}>Mensuel</option>
                </select>
            </td>
            <td class="date-inputs">
                <input type="date" name="date" value="${income.date}" required>
                ${income.is_recurring ? 
                    `<input type="number" name="day" min="1" max="31" value="${income.day}" placeholder="Jour du mois">` : 
                    ''}
            </td>
            <td>
                <button type="button" class="save-button">Enregistrer</button>
                <button type="button" class="cancel-button">Annuler</button>
            </td>
        </tr>
    `;

    row.outerHTML = formHTML;
    const form = document.querySelector('.income-edit-form');

    // Gérer le changement de type de revenu
    const typeSelect = form.querySelector('[name="type"]');
    typeSelect.addEventListener('change', (e) => {
        const dateCell = form.querySelector('.date-inputs');
        if (e.target.value === 'monthly') {
            const currentDate = new Date(form.querySelector('[name="date"]').value);
            dateCell.innerHTML += `
                <input type="number" name="day" min="1" max="31" value="${currentDate.getDate()}" placeholder="Jour du mois">
            `;
        } else {
            form.querySelector('[name="day"]')?.remove();
        }
    });

    // Gérer la sauvegarde
    form.querySelector('.save-button').addEventListener('click', async () => {
        const updatedIncome = {
            id: income.id,
            description: form.querySelector('[name="description"]').value,
            amount: parseFloat(form.querySelector('[name="amount"]').value),
            date: form.querySelector('[name="date"]').value,
            is_recurring: form.querySelector('[name="type"]').value === 'monthly',
            day: form.querySelector('[name="day"]')?.value || null
        };

        try {
            await updateIncome(updatedIncome);
            await updateUI();
        } catch (error) {
            alert('Erreur lors de la mise à jour du revenu');
            console.error(error);
        }
    });

    // Gérer l'annulation
    form.querySelector('.cancel-button').addEventListener('click', () => {
        updateUI();
    });
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

window.deleteIncome = async (id) => {
    await deleteIncome(id);
    updateUI();
};
