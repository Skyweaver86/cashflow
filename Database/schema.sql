-- CashFlow Personal Finance Management Tool Database Schema
-- Created: 2026

-- Drop existing database if exists
DROP DATABASE IF EXISTS cashflow_db;
CREATE DATABASE cashflow_db;
USE cashflow_db;

-- Users Table
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    theme_preference ENUM('orange', 'dark', 'light', 'starbucks', 'ocean') DEFAULT 'starbucks',
    profile_picture VARCHAR(255) DEFAULT NULL
);

-- Predefined Categories Table
CREATE TABLE predefined_categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL,
    category_type ENUM('income', 'expense') NOT NULL,
    icon VARCHAR(50) DEFAULT 'default',
    color VARCHAR(20) DEFAULT '#EB5002'
);

-- User-Defined Categories Table
CREATE TABLE user_categories (
    user_category_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_name VARCHAR(50) NOT NULL,
    category_type ENUM('income', 'expense') NOT NULL,
    icon VARCHAR(50) DEFAULT 'default',
    color VARCHAR(20) DEFAULT '#EB5002',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Income Tracking Table
CREATE TABLE income (
    income_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT,
    user_category_id INT,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    income_date DATE NOT NULL,
    recurring BOOLEAN DEFAULT FALSE,
    recurring_frequency ENUM('daily', 'weekly', 'monthly', 'yearly') NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES predefined_categories(category_id) ON DELETE SET NULL,
    FOREIGN KEY (user_category_id) REFERENCES user_categories(user_category_id) ON DELETE SET NULL
);

-- Expense Tracking Table
CREATE TABLE expenses (
    expense_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT,
    user_category_id INT,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    recurring BOOLEAN DEFAULT FALSE,
    recurring_frequency ENUM('daily', 'weekly', 'monthly', 'yearly') NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES predefined_categories(category_id) ON DELETE SET NULL,
    FOREIGN KEY (user_category_id) REFERENCES user_categories(user_category_id) ON DELETE SET NULL
);

-- Budget Planning Table
CREATE TABLE budgets (
    budget_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT,
    user_category_id INT,
    budget_amount DECIMAL(15, 2) NOT NULL,
    period ENUM('weekly', 'monthly', 'yearly') DEFAULT 'monthly',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES predefined_categories(category_id) ON DELETE SET NULL,
    FOREIGN KEY (user_category_id) REFERENCES user_categories(user_category_id) ON DELETE SET NULL
);

-- Savings Goals Table
CREATE TABLE savings_goals (
    goal_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    goal_name VARCHAR(100) NOT NULL,
    target_amount DECIMAL(15, 2) NOT NULL,
    current_amount DECIMAL(15, 2) DEFAULT 0.00,
    deadline DATE,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Monthly Bills Table
CREATE TABLE monthly_bills (
    bill_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    bill_name VARCHAR(100) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    due_date INT NOT NULL CHECK (due_date BETWEEN 1 AND 31),
    category_id INT,
    user_category_id INT,
    is_paid BOOLEAN DEFAULT FALSE,
    auto_pay BOOLEAN DEFAULT FALSE,
    reminder_days INT DEFAULT 3,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES predefined_categories(category_id) ON DELETE SET NULL,
    FOREIGN KEY (user_category_id) REFERENCES user_categories(user_category_id) ON DELETE SET NULL
);

-- Bill Payment History Table
CREATE TABLE bill_payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    bill_id INT NOT NULL,
    user_id INT NOT NULL,
    payment_date DATE NOT NULL,
    amount_paid DECIMAL(15, 2) NOT NULL,
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES monthly_bills(bill_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Family Sharing Table (Bill Sharing)
CREATE TABLE family_sharing (
    share_id INT AUTO_INCREMENT PRIMARY KEY,
    bill_id INT NOT NULL,
    owner_user_id INT NOT NULL,
    shared_with_user_id INT NOT NULL,
    share_percentage DECIMAL(5, 2) DEFAULT 50.00,
    status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES monthly_bills(bill_id) ON DELETE CASCADE,
    FOREIGN KEY (owner_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Currency Exchange Rates Table
CREATE TABLE exchange_rates (
    rate_id INT AUTO_INCREMENT PRIMARY KEY,
    from_currency VARCHAR(10) NOT NULL,
    to_currency VARCHAR(10) NOT NULL,
    rate DECIMAL(15, 6) NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_pair (from_currency, to_currency)
);

-- Finance History Log Table
CREATE TABLE finance_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    transaction_type ENUM('income', 'expense', 'budget', 'goal', 'bill') NOT NULL,
    transaction_id INT NOT NULL,
    action_type ENUM('created', 'updated', 'deleted') NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Notifications Table
CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    notification_type ENUM('bill_reminder', 'budget_warning', 'goal_achieved', 'share_request') NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    related_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Insert Predefined Categories
INSERT INTO predefined_categories (category_name, category_type, icon, color) VALUES
('Salary', 'income', 'briefcase', '#2563EB'),
('Freelance', 'income', 'laptop', '#7C3AED'),
('Investment', 'income', 'trending-up', '#059669'),
('Business', 'income', 'shopping-bag', '#D97706'),
('Gift', 'income', 'gift', '#DB2777'),
('Other Income', 'income', 'dollar-sign', '#6B7280'),
('Food & Dining', 'expense', 'utensils', '#EF4444'),
('Transportation', 'expense', 'car', '#F59E0B'),
('Shopping', 'expense', 'shopping-cart', '#8B5CF6'),
('Entertainment', 'expense', 'film', '#EC4899'),
('Bills & Utilities', 'expense', 'file-text', '#3B82F6'),
('Healthcare', 'expense', 'heart', '#10B981'),
('Education', 'expense', 'book', '#6366F1'),
('Travel', 'expense', 'plane', '#14B8A6'),
('Insurance', 'expense', 'shield', '#64748B'),
('Housing', 'expense', 'home', '#F97316'),
('Personal Care', 'expense', 'user', '#A855F7'),
('Other Expense', 'expense', 'more-horizontal', '#9CA3AF');

-- Insert Sample Exchange Rates
INSERT INTO exchange_rates (from_currency, to_currency, rate) VALUES
('USD', 'EUR', 0.92),
('USD', 'GBP', 0.79),
('USD', 'JPY', 149.50),
('USD', 'PHP', 56.50),
('USD', 'AUD', 1.53),
('USD', 'CAD', 1.36),
('EUR', 'USD', 1.09),
('EUR', 'GBP', 0.86),
('EUR', 'JPY', 162.95),
('EUR', 'PHP', 61.59),
('EUR', 'AUD', 1.67),
('EUR', 'CAD', 1.48),
('GBP', 'USD', 1.27),
('GBP', 'EUR', 1.16),
('GBP', 'JPY', 189.46),
('GBP', 'PHP', 71.55),
('GBP', 'AUD', 1.94),
('GBP', 'CAD', 1.72),
('JPY', 'USD', 0.0067),
('JPY', 'EUR', 0.0061),
('JPY', 'GBP', 0.0053),
('JPY', 'PHP', 0.378),
('JPY', 'AUD', 0.010),
('JPY', 'CAD', 0.0091),
('PHP', 'USD', 0.018),
('PHP', 'EUR', 0.016),
('PHP', 'GBP', 0.014),
('PHP', 'JPY', 2.645),
('PHP', 'AUD', 0.027),
('PHP', 'CAD', 0.024),
('AUD', 'USD', 0.654),
('AUD', 'EUR', 0.600),
('AUD', 'GBP', 0.515),
('AUD', 'JPY', 97.71),
('AUD', 'PHP', 36.93),
('AUD', 'CAD', 0.889),
('CAD', 'USD', 0.735),
('CAD', 'EUR', 0.675),
('CAD', 'GBP', 0.580),
('CAD', 'JPY', 109.93),
('CAD', 'PHP', 41.54),
('CAD', 'AUD', 1.125);

-- Create Indexes for Performance
CREATE INDEX idx_income_user_date ON income(user_id, income_date);
CREATE INDEX idx_expenses_user_date ON expenses(user_id, expense_date);
CREATE INDEX idx_budgets_user_period ON budgets(user_id, start_date, end_date);
CREATE INDEX idx_bills_user_due ON monthly_bills(user_id, due_date);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_history_user_date ON finance_history(user_id, created_at);
