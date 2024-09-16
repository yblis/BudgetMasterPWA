import { initDB, addExpense, getExpenses, addCategory, getCategories, addIncome, getIncome } from './db.js';
import { updateUI, showTab } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    updateUI();

    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            showTab(button.dataset.tab);
        });
    });

    // Quick expense form
    document.getElementById('quick-expense-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = document.getElementById('quick-expense-amount').value;
        const description = document.getElementById('quick-expense-description').value;
        const category = document.getElementById('quick-expense-category').value;
        const date = document.getElementById('quick-expense-date').value || new Date().toISOString().split('T')[0];
        await addExpense(amount, description, category, 'variable', date);
        updateUI();
        e.target.reset();
        document.getElementById('quick-expense-date').value = new Date().toISOString().split('T')[0];
    });

    // Fixed expense form
    document.getElementById('expense-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = document.getElementById('expense-amount').value;
        const description = document.getElementById('expense-description').value;
        const category = document.getElementById('expense-category').value;
        const frequency = document.getElementById('expense-frequency').value;
        const date = document.getElementById('expense-date').value || new Date().toISOString().split('T')[0];
        await addExpense(amount, description, category, 'fixed', date, frequency);
        updateUI();
        e.target.reset();
        document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
    });

    // Category form
    document.getElementById('category-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('category-name').value;
        await addCategory(name);
        updateUI();
        e.target.reset();
    });

    // Income form
    document.getElementById('income-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = document.getElementById('income-amount').value;
        const description = document.getElementById('income-description').value;
        const date = document.getElementById('income-date').value || new Date().toISOString().split('T')[0];
        const isRecurring = document.getElementById('income-recurring').checked;
        await addIncome(amount, description, date, isRecurring);
        updateUI();
        e.target.reset();
        document.getElementById('income-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('income-recurring').checked = true;
    });

    // Set default dates
    document.getElementById('quick-expense-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('income-date').value = new Date().toISOString().split('T')[0];
});
