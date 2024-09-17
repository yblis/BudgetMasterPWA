import { initDB, addExpense, getExpenses, addCategory, getCategories, addIncome, getIncome } from './db.js';
import { updateUI, showTab } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    updateUI();

    // Hamburger menu functionality
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const mainNav = document.getElementById('main-nav');

    hamburgerMenu.addEventListener('click', () => {
        mainNav.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (event) => {
        if (!event.target.closest('#main-nav') && !event.target.closest('#hamburger-menu')) {
            mainNav.classList.remove('active');
        }
    });

    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            showTab(button.dataset.tab);
            // Close menu after selecting a tab on mobile
            if (window.innerWidth <= 768) {
                mainNav.classList.remove('active');
            }
        });
    });

    // Quick expense form
    document.getElementById('quick-expense-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('quick-expense-amount').value);
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
        const amount = parseFloat(document.getElementById('expense-amount').value);
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
        const color = document.getElementById('category-color').value;
        await addCategory(name, color);
        updateUI();
        e.target.reset();
    });

    // Income form
    document.getElementById('income-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('income-amount').value);
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

    // Subscribe to push notifications
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js');
            await subscribeToPushNotifications(registration);
        } catch (error) {
            console.error('Error registering service worker:', error);
        }
    }
});

async function subscribeToPushNotifications(registration) {
    try {
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: await getVapidPublicKey()
        });
        await sendSubscriptionToServer(subscription);
    } catch (error) {
        console.error('Failed to subscribe to push notifications:', error);
    }
}

async function getVapidPublicKey() {
    const response = await fetch('/api/vapid-public-key');
    const data = await response.json();
    return urlBase64ToUint8Array(data.public_key);
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function sendSubscriptionToServer(subscription) {
    await fetch('/api/push-subscription', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
    });
}
