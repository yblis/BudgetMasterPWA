export class EnvelopeCalculator {
    constructor() {
        this.simulations = [];
        this.initializeListeners();
    }

    initializeListeners() {
        document.getElementById('envelope-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.calculateEnvelope();
        });

        document.getElementById('simulation-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addSimulation();
        });
    }

    async calculateEnvelope() {
        const currentBalance = parseFloat(document.getElementById('current-balance').value);
        const nextSalary = parseFloat(document.getElementById('next-salary').value);
        const salaryDate = new Date(document.getElementById('salary-date').value);
        
        // Récupérer les dépenses fixes jusqu'à la date du salaire
        const fixedExpenses = await this.getFixedExpensesBetweenDates(new Date(), salaryDate);
        
        // Calculer les moyennes des dépenses variables
        const variableExpenses = await this.getAverageVariableExpenses();
        
        // Calculer l'enveloppe disponible
        const totalExpenses = fixedExpenses + variableExpenses;
        const daysUntilSalary = Math.ceil((salaryDate - new Date()) / (1000 * 60 * 60 * 24));
        const dailyBudget = (currentBalance + nextSalary - totalExpenses) / daysUntilSalary;
        
        this.updateEnvelopeDisplay(currentBalance, nextSalary, totalExpenses, dailyBudget, daysUntilSalary);
    }

    async getFixedExpensesBetweenDates(startDate, endDate) {
        // Implémenter la logique pour récupérer les dépenses fixes
        // À connecter avec votre base de données
        return 0;
    }

    async getAverageVariableExpenses() {
        // Implémenter la logique pour calculer la moyenne des dépenses variables
        // À connecter avec votre base de données
        return 0;
    }

    addSimulation() {
        const amount = parseFloat(document.getElementById('simulation-amount').value);
        const description = document.getElementById('simulation-description').value;
        const date = document.getElementById('simulation-date').value;
        
        this.simulations.push({ amount, description, date });
        this.updateSimulationsList();
        this.calculateEnvelope(); // Recalculer avec la nouvelle simulation
    }

    updateEnvelopeDisplay(currentBalance, nextSalary, totalExpenses, dailyBudget, daysUntilSalary) {
        const envelopeDetails = document.getElementById('envelope-details');
        envelopeDetails.innerHTML = `
            <div class="envelope-stats">
                <div class="stat-card">
                    <div class="stat-value">${dailyBudget.toFixed(2)}€</div>
                    <div class="stat-label">Budget journalier</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${daysUntilSalary}</div>
                    <div class="stat-label">Jours restants</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${(currentBalance + nextSalary - totalExpenses).toFixed(2)}€</div>
                    <div class="stat-label">Enveloppe totale</div>
                </div>
            </div>
        `;

        this.updateEnvelopeChart(currentBalance, nextSalary, totalExpenses);
    }

    updateEnvelopeChart(currentBalance, nextSalary, totalExpenses) {
        // Implémenter le graphique avec Chart.js
        // Exemple de visualisation des données
    }

    updateSimulationsList() {
        const container = document.getElementById('simulations-list');
        container.innerHTML = this.simulations.map(sim => `
            <div class="simulation-item">
                <span>${sim.description}</span>
                <span>${sim.amount.toFixed(2)}€</span>
                <span>${new Date(sim.date).toLocaleDateString()}</span>
            </div>
        `).join('');
    }
}
