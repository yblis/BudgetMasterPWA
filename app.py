from flask import Flask, render_template, request, jsonify
from database import init_db, get_db
import sqlite3
from pywebpush import webpush, WebPushException
import json
import os
from datetime import datetime, timedelta

app = Flask(__name__)

# Initialize the database
init_db()

VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY')
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY')
VAPID_CLAIMS = {
    "sub": "mailto:your@email.com"
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/expenses', methods=['GET', 'POST'])
def expenses():
    db = get_db()
    if request.method == 'POST':
        data = request.json
        if data and 'type' in data:
            if data['type'] == 'fixed':
                date_obj = datetime.strptime(data.get('date'), '%Y-%m-%d')
                date1 = str(date_obj.day)
                date2 = None
                
                if data.get('frequency') == 'bimonthly':
                    # Pour le bimensuel, on met la même date pour date1 et date2 initialement
                    date2 = date1

                db.execute('''
                    INSERT INTO expenses (amount, description, category, type, date, frequency, date1, date2)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (data.get('amount'), data.get('description'), data.get('category'), 
                      data.get('type'), data.get('date'), data.get('frequency'), 
                      date1, date2))
            else:
                db.execute('''
                    INSERT INTO expenses (amount, description, category, type, date)
                    VALUES (?, ?, ?, ?, ?)
                ''', (data.get('amount'), data.get('description'), data.get('category'), data.get('type'), data.get('date')))
            db.commit()
            check_and_send_notifications()
            return jsonify({'status': 'success'}), 201
        else:
            return jsonify({'status': 'error', 'message': 'Invalid data'}), 400
    else:
        expenses = db.execute('SELECT * FROM expenses').fetchall()
        return jsonify([dict(expense) for expense in expenses])

@app.route('/api/expenses/<int:id>', methods=['DELETE'])
def delete_expense(id):
    try:
        db = get_db()
        # Vérifier si la dépense existe
        expense = db.execute('SELECT * FROM expenses WHERE id = ?', (id,)).fetchone()
        if not expense:
            return jsonify({'status': 'error', 'message': 'Dépense non trouvée'}), 404
            
        db.execute('DELETE FROM expenses WHERE id = ?', (id,))
        db.commit()
        return jsonify({'status': 'success'}), 200
    except sqlite3.Error as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/expenses/<int:id>', methods=['PUT'])
def update_expense(id):
    try:
        db = get_db()
        data = request.json
        
        if data['frequency'] == 'monthly':
            db.execute('''
                UPDATE expenses 
                SET amount=?, description=?, category=?, type=?, frequency=?, date1=?, date2=NULL
                WHERE id=?
            ''', (data['amount'], data['description'], data['category'],
                  data['type'], data['frequency'], data['date1'], id))
        else:
            db.execute('''
                UPDATE expenses 
                SET amount=?, description=?, category=?, type=?, frequency=?, date1=?, date2=?
                WHERE id=?
            ''', (data['amount'], data['description'], data['category'],
                  data['type'], data['frequency'], data['date1'], data['date2'], id))
        
        db.commit()
        return jsonify({'status': 'success'}), 200
    except sqlite3.Error as e:
        print(f"Database error: {e}")  # Ajout d'un log pour le débogage
        return jsonify({
            'status': 'error',
            'message': 'Erreur lors de la mise à jour de la dépense: ' + str(e)
        }), 500

@app.route('/api/categories', methods=['GET', 'POST'])
def categories():
    db = get_db()
    if request.method == 'POST':
        data = request.json
        if data and 'name' in data and 'color' in data:
            try:
                db.execute('INSERT INTO categories (name, color) VALUES (?, ?)', 
                          (data['name'], data['color']))
                db.commit()
                return jsonify({'status': 'success'}), 201
            except sqlite3.IntegrityError:
                return jsonify({
                    'status': 'error',
                    'message': f'Une catégorie avec le nom "{data["name"]}" existe déjà'
                }), 409  # 409 Conflict
            except sqlite3.Error as e:
                return jsonify({
                    'status': 'error',
                    'message': 'Erreur lors de l\'ajout de la catégorie'
                }), 500
        else:
            return jsonify({
                'status': 'error',
                'message': 'Données invalides'
            }), 400
    else:
        categories = db.execute('SELECT * FROM categories').fetchall()
        return jsonify([dict(category) for category in categories])

@app.route('/api/categories/<int:id>', methods=['DELETE'])
def delete_category(id):
    try:
        db = get_db()
        # Vérifier si la catégorie est utilisée
        expenses = db.execute('SELECT COUNT(*) as count FROM expenses WHERE category = (SELECT name FROM categories WHERE id = ?)', (id,)).fetchone()
        if expenses['count'] > 0:
            return jsonify({'status': 'error', 'message': 'Cette catégorie est utilisée par des dépenses existantes'}), 400
        
        db.execute('DELETE FROM categories WHERE id = ?', (id,))
        db.commit()
        return jsonify({'status': 'success'}), 200
    except sqlite3.Error as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/income', methods=['GET', 'POST'])
def income():
    db = get_db()
    if request.method == 'POST':
        data = request.json
        if data:
            db.execute('INSERT INTO income (amount, description, date, is_recurring, frequency, day) VALUES (?, ?, ?, ?, ?, ?)',
                       (data.get('amount'), data.get('description'), data.get('date'),
                        data.get('isRecurring'), data.get('frequency'), data.get('day')))
            db.commit()
            check_and_send_notifications()
            return jsonify({'status': 'success'}), 201
        else:
            return jsonify({'status': 'error', 'message': 'Invalid data'}), 400
    else:
        income = db.execute('SELECT * FROM income').fetchall()
        return jsonify([dict(inc) for inc in income])

@app.route('/api/income/<int:id>', methods=['DELETE'])
def delete_income(id):
    try:
        db = get_db()
        db.execute('DELETE FROM income WHERE id = ?', (id,))
        db.commit()
        return jsonify({'status': 'success'}), 200
    except sqlite3.Error as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/income/<int:id>', methods=['PUT'])
def update_income(id):
    try:
        db = get_db()
        data = request.json
        
        db.execute('''
            UPDATE income 
            SET amount=?, description=?, date=?, is_recurring=?, frequency=?, day=?
            WHERE id=?
        ''', (data['amount'], data['description'], data['date'],
              data['is_recurring'], 
              'monthly' if data['is_recurring'] else None,
              data['day'], id))
        
        db.commit()
        return jsonify({'status': 'success'}), 200
    except sqlite3.Error as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/push-subscription', methods=['POST'])
def store_push_subscription():
    db = get_db()
    subscription = request.json
    db.execute('INSERT OR REPLACE INTO push_subscriptions (subscription) VALUES (?)',
               (json.dumps(subscription),))
    db.commit()
    return jsonify({'status': 'success'}), 201

@app.route('/api/send-notification', methods=['POST'])
def send_notification():
    db = get_db()
    subscriptions = db.execute('SELECT subscription FROM push_subscriptions').fetchall()
    notification = request.json

    for subscription in subscriptions:
        try:
            webpush(
                json.loads(subscription['subscription']),
                json.dumps(notification),
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims=VAPID_CLAIMS
            )
        except WebPushException as e:
            print(f"Webpush failed: {e}")

    return jsonify({'status': 'success'}), 200

@app.route('/api/vapid-public-key')
def get_vapid_public_key():
    return jsonify({'public_key': VAPID_PUBLIC_KEY})

@app.route('/api/recurring-transactions', methods=['GET'])
def process_recurring_transactions():
    """Process all recurring transactions (expenses and income) for the current month"""
    try:
        db = get_db()
        today = datetime.now()
        first_of_month = today.replace(day=1)
        
        # Process fixed expenses - Ne pas créer de dépense variable lors de la création d'une dépense fixe
        fixed_expenses = db.execute('''
            SELECT * FROM expenses 
            WHERE type = 'fixed' 
            AND frequency IN ('monthly', 'bimonthly')
            AND date < ?
        ''', (first_of_month.strftime('%Y-%m-%d'),)).fetchall()

        for expense in fixed_expenses:
            if expense['frequency'] == 'monthly':
                # Add monthly expense if not already added this month
                if not check_transaction_exists(db, 'expenses', expense, first_of_month):
                    add_recurring_expense(db, expense, today)
            
            elif expense['frequency'] == 'bimonthly':
                # Add bimonthly expenses if not already added this month
                dates = [expense['date1'], expense['date2']]
                for date in dates:
                    if date and not check_transaction_exists(db, 'expenses', expense, first_of_month, date):
                        add_recurring_expense(db, expense, today, date)

        # Process recurring income
        recurring_income = db.execute('''
            SELECT * FROM income 
            WHERE is_recurring = 1
            AND date < ?
        ''', (first_of_month.strftime('%Y-%m-%d'),)).fetchall()

        for income in recurring_income:
            if not check_transaction_exists(db, 'income', income, first_of_month):
                add_recurring_income(db, income, today)

        db.commit()
        return jsonify({'status': 'success'}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

def check_transaction_exists(db, table, transaction, first_of_month, specific_date=None):
    """Check if a transaction has already been added for the current month"""
    if table == 'expenses':
        date_check = specific_date if specific_date else transaction['date1']
        return db.execute('''
            SELECT COUNT(*) as count 
            FROM expenses 
            WHERE description = ? 
            AND amount = ? 
            AND category = ? 
            AND type = 'variable'
            AND date >= ? 
            AND date1 = ?
        ''', (transaction['description'], transaction['amount'], 
              transaction['category'], first_of_month.strftime('%Y-%m-%d'),
              date_check)).fetchone()['count'] > 0
    else:
        return db.execute('''
            SELECT COUNT(*) as count 
            FROM income 
            WHERE description = ? 
            AND amount = ? 
            AND date >= ?
        ''', (transaction['description'], transaction['amount'], 
              first_of_month.strftime('%Y-%m-%d'))).fetchone()['count'] > 0

def add_recurring_expense(db, expense, current_date, specific_date=None):
    """Add a recurring expense for the current month"""
    day = specific_date if specific_date else expense['date1']
    try:
        # Créer la date pour ce mois
        new_date = current_date.replace(day=int(day)).strftime('%Y-%m-%d')
        
        db.execute('''
            INSERT INTO expenses (amount, description, category, type, date, date1)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (expense['amount'], expense['description'], expense['category'],
              'variable', new_date, day))
    except ValueError:
        # Gérer le cas des mois plus courts (ex: 31 en février)
        last_day = (current_date.replace(day=1) + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        new_date = last_day.strftime('%Y-%m-%d')
        db.execute('''
            INSERT INTO expenses (amount, description, category, type, date, date1)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (expense['amount'], expense['description'], expense['category'],
              'variable', new_date, day))

def add_recurring_income(db, income, current_date):
    """Add a recurring income for the current month"""
    try:
        # Créer la date pour ce mois
        new_date = current_date.replace(day=int(income['day'])).strftime('%Y-%m-%d')
        
        db.execute('''
            INSERT INTO income (amount, description, date, is_recurring, day)
            VALUES (?, ?, ?, ?, ?)
        ''', (income['amount'], income['description'], new_date, False, income['day']))
    except ValueError:
        # Gérer le cas des mois plus courts
        last_day = (current_date.replace(day=1) + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        new_date = last_day.strftime('%Y-%m-%d')
        db.execute('''
            INSERT INTO income (amount, description, date, is_recurring, day)
            VALUES (?, ?, ?, ?, ?)
        ''', (income['amount'], income['description'], new_date, False, income['day']))

def check_and_send_notifications():
    db = get_db()
    today = datetime.now().date()
    
    # Check for recurring expenses
    recurring_expenses = db.execute('''
        SELECT * FROM expenses 
        WHERE type = 'fixed' AND frequency IN ('monthly', 'bimonthly')
    ''').fetchall()

    for expense in recurring_expenses:
        try:
            if expense['frequency'] == 'monthly' and expense['date1']:
                next_date = get_next_occurrence(expense['date1'])
                if next_date:
                    check_expense_notification(expense, next_date, today)
            elif expense['frequency'] == 'bimonthly' and expense['date1'] and expense['date2']:
                next_date1 = get_next_occurrence(expense['date1'])
                next_date2 = get_next_occurrence(expense['date2'])
                if next_date1 and next_date2:
                    next_date = min(next_date1, next_date2)
                    check_expense_notification(expense, next_date, today)
        except Exception as e:
            print(f"Error processing expense {expense['id']}: {e}")

    # Check for low budget alert
    total_income = db.execute('SELECT SUM(amount) as total FROM income').fetchone()['total'] or 0
    total_expenses = db.execute('SELECT SUM(amount) as total FROM expenses').fetchone()['total'] or 0
    remaining_budget = total_income - total_expenses

    if remaining_budget < 0.2 * total_income:  # Alert if less than 20% of income remains
        send_notification(f"Low Budget Alert: Only {remaining_budget:.2f} € remaining")

    # Appeler l'API de traitement des transactions récurrentes
    try:
        process_recurring_transactions()
    except Exception as e:
        print(f"Error processing recurring transactions: {e}")

def get_next_occurrence(day):
    if day is None:
        return None
    
    today = datetime.now().date()
    try:
        day = int(day)
        if day < today.day:
            next_month = today.replace(day=1) + timedelta(days=32)
            return next_month.replace(day=min(day, next_month.day))
        return today.replace(day=min(day, today.day))
    except (ValueError, TypeError):
        return None

def check_expense_notification(expense, next_date, today):
    if next_date == today:
        send_notification(f"Dépense récurrente : {expense['description']} - {expense['amount']} € aujourd'hui")
    elif next_date == today + timedelta(days=1):
        send_notification(f"Dépense à venir : {expense['description']} - {expense['amount']} € demain")

def send_notification(message):
    db = get_db()
    subscriptions = db.execute('SELECT subscription FROM push_subscriptions').fetchall()
    notification = {
        "title": "Budget Manager Alert",
        "body": message,
        "icon": "/static/icons/icon-192x192.png"
    }

    for subscription in subscriptions:
        try:
            webpush(
                json.loads(subscription['subscription']),
                json.dumps(notification),
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims=VAPID_CLAIMS
            )
        except WebPushException as e:
            print(f"Webpush failed: {e}")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
