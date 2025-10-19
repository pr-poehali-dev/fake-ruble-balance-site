-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 10000.00 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы транзакций
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER REFERENCES users(id),
    to_user_id INTEGER REFERENCES users(id),
    amount DECIMAL(15, 2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_transactions_from_user ON transactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_user ON transactions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(created_at DESC);

-- Добавление тестовых пользователей
INSERT INTO users (username, password_hash, full_name, balance) VALUES
('demo', '$2b$10$rQ7Z8Z9Z9Z9Z9Z9Z9Z9Z9u', 'Демо Пользователь', 25000.00),
('ivan_petrov', '$2b$10$rQ7Z8Z9Z9Z9Z9Z9Z9Z9Z9u', 'Иван Петров', 50000.00),
('maria_ivanova', '$2b$10$rQ7Z8Z9Z9Z9Z9Z9Z9Z9Z9u', 'Мария Иванова', 75000.00)
ON CONFLICT (username) DO NOTHING;

-- Добавление тестовых транзакций
INSERT INTO transactions (from_user_id, to_user_id, amount, transaction_type, description) VALUES
(2, 3, 5000.00, 'transfer', 'Оплата за услуги'),
(3, 2, 2000.00, 'transfer', 'Возврат долга'),
(1, 2, 1500.00, 'transfer', 'Подарок')
ON CONFLICT DO NOTHING;