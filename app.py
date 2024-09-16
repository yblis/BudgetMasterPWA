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
                db.execute('''
                    INSERT INTO expenses (amount, description, category, type, date, frequency, date1, date2)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (data.get('amount'), data.get('description'), data.get('category'), data.get('type'),
                      data.get('date'), data.get('frequency'), data.get('date1'), data.get('date2')))
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

@app.route('/api/categories', methods=['GET', 'POST'])
def categories():
    db = get_db()
    if request.method == 'POST':
        data = request.json
        if data and 'name' in data:
            db.execute('INSERT INTO categories (name) VALUES (?)', (data['name'],))
            db.commit()
            return jsonify({'status': 'success'}), 201
        else:
            return jsonify({'status': 'error', 'message': 'Invalid data'}), 400
    else:
        categories = db.execute('SELECT * FROM categories').fetchall()
        return jsonify([dict(category) for category in categories])

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

def check_and_send_notifications():
    db = get_db()
    today = datetime.now().date()
    
    # Check for recurring expenses
    recurring_expenses = db.execute('''
        SELECT * FROM expenses 
        WHERE type = 'fixed' AND frequency IN ('monthly', 'bimonthly')
    ''').fetchall()

    for expense in recurring_expenses:
        if expense['frequency'] == 'monthly':
            next_date = get_next_occurrence(expense['date1'])
        else:  # bimonthly
            next_date1 = get_next_occurrence(expense['date1'])
            next_date2 = get_next_occurrence(expense['date2'])
            next_date = min(next_date1, next_date2)

        if next_date == today:
            send_notification(f"Recurring Expense: {expense['description']} - {expense['amount']} due today")

    # Check for low budget alert
    total_income = db.execute('SELECT SUM(amount) as total FROM income').fetchone()['total'] or 0
    total_expenses = db.execute('SELECT SUM(amount) as total FROM expenses').fetchone()['total'] or 0
    remaining_budget = total_income - total_expenses

    if remaining_budget < 0.2 * total_income:  # Alert if less than 20% of income remains
        send_notification(f"Low Budget Alert: Only {remaining_budget:.2f} remaining")

def get_next_occurrence(day):
    today = datetime.now().date()
    day = int(day)
    if day < today.day:
        next_month = today.replace(day=1) + timedelta(days=32)
        return next_month.replace(day=day)
    return today.replace(day=day)

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
