from flask import Flask, render_template, request, jsonify
from database import init_db, get_db
import sqlite3

app = Flask(__name__)

# Initialize the database
init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/expenses', methods=['GET', 'POST'])
def expenses():
    db = get_db()
    if request.method == 'POST':
        data = request.json
        if data['type'] == 'fixed':
            db.execute('''
                INSERT INTO expenses (amount, description, category, type, date, frequency, date1, date2)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (data['amount'], data['description'], data['category'], data['type'],
                  data['date'], data['frequency'], data['date1'], data['date2']))
        else:
            db.execute('''
                INSERT INTO expenses (amount, description, category, type, date)
                VALUES (?, ?, ?, ?, ?)
            ''', (data['amount'], data['description'], data['category'], data['type'], data['date']))
        db.commit()
        return jsonify({'status': 'success'}), 201
    else:
        expenses = db.execute('SELECT * FROM expenses').fetchall()
        return jsonify([dict(expense) for expense in expenses])

@app.route('/api/categories', methods=['GET', 'POST'])
def categories():
    db = get_db()
    if request.method == 'POST':
        data = request.json
        db.execute('INSERT INTO categories (name) VALUES (?)', (data['name'],))
        db.commit()
        return jsonify({'status': 'success'}), 201
    else:
        categories = db.execute('SELECT * FROM categories').fetchall()
        return jsonify([dict(category) for category in categories])

@app.route('/api/income', methods=['GET', 'POST'])
def income():
    db = get_db()
    if request.method == 'POST':
        data = request.json
        db.execute('INSERT INTO income (amount, description, date) VALUES (?, ?, ?)',
                   (data['amount'], data['description'], data['date']))
        db.commit()
        return jsonify({'status': 'success'}), 201
    else:
        income = db.execute('SELECT * FROM income').fetchall()
        return jsonify([dict(inc) for inc in income])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
