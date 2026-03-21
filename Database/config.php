<?php
/**
 * CashFlow Database Configuration
 * AUTO-INITIALIZES tables and seed data if missing
 */

error_reporting(0);
ini_set('display_errors', 0);

define('DB_HOST', getenv('DB_HOST') ?: 'db');
define('DB_USER', getenv('DB_USER') ?: 'cashflow_user');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_NAME', getenv('DB_NAME') ?: 'cashflow_db');
define('DB_CHARSET', 'utf8mb4');

class Database {
    private static $instance = null;
    private $connection;

    private function __construct() {
        try {
            // Connect WITHOUT selecting a database first
            $pdo = new PDO(
                "mysql:host=" . DB_HOST . ";charset=" . DB_CHARSET,
                DB_USER, DB_PASS,
                [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]
            );
            // Create database if it doesn't exist
            $pdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $pdo->exec("USE `" . DB_NAME . "`");
            $this->connection = $pdo;
            // Always ensure tables exist
            $this->initTables();
            $this->seedData();
        } catch (PDOException $e) {
            throw new Exception("Database Connection Failed: " . $e->getMessage());
        }
    }

    private function initTables() {
        $db = $this->connection;
        $db->exec("CREATE TABLE IF NOT EXISTS users (
            user_id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            currency VARCHAR(10) DEFAULT 'PHP',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP NULL,
            theme_preference ENUM('orange','dark','light','starbucks','ocean') DEFAULT 'starbucks',
            profile_picture VARCHAR(255) DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $db->exec("CREATE TABLE IF NOT EXISTS predefined_categories (
            category_id INT AUTO_INCREMENT PRIMARY KEY,
            category_name VARCHAR(50) NOT NULL,
            category_type ENUM('income','expense') NOT NULL,
            icon VARCHAR(50) DEFAULT 'circle',
            color VARCHAR(20) DEFAULT '#00704A'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $db->exec("CREATE TABLE IF NOT EXISTS user_categories (
            user_category_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            category_name VARCHAR(50) NOT NULL,
            category_type ENUM('income','expense') NOT NULL,
            icon VARCHAR(50) DEFAULT 'circle',
            color VARCHAR(20) DEFAULT '#00704A',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $db->exec("CREATE TABLE IF NOT EXISTS income (
            income_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            category_id INT DEFAULT NULL,
            user_category_id INT DEFAULT NULL,
            amount DECIMAL(15,2) NOT NULL,
            description TEXT,
            income_date DATE NOT NULL,
            recurring BOOLEAN DEFAULT FALSE,
            recurring_frequency ENUM('daily','weekly','monthly','yearly') NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $db->exec("CREATE TABLE IF NOT EXISTS expenses (
            expense_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            category_id INT DEFAULT NULL,
            user_category_id INT DEFAULT NULL,
            amount DECIMAL(15,2) NOT NULL,
            description TEXT,
            expense_date DATE NOT NULL,
            recurring BOOLEAN DEFAULT FALSE,
            recurring_frequency ENUM('daily','weekly','monthly','yearly') NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $db->exec("CREATE TABLE IF NOT EXISTS budgets (
            budget_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            category_id INT DEFAULT NULL,
            user_category_id INT DEFAULT NULL,
            budget_amount DECIMAL(15,2) NOT NULL,
            period ENUM('weekly','monthly','yearly') DEFAULT 'monthly',
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $db->exec("CREATE TABLE IF NOT EXISTS savings_goals (
            goal_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            goal_name VARCHAR(100) NOT NULL,
            target_amount DECIMAL(15,2) NOT NULL,
            current_amount DECIMAL(15,2) DEFAULT 0.00,
            deadline DATE NULL,
            priority ENUM('low','medium','high') DEFAULT 'medium',
            status ENUM('active','completed','cancelled') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP NULL,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $db->exec("CREATE TABLE IF NOT EXISTS monthly_bills (
            bill_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            bill_name VARCHAR(100) NOT NULL,
            amount DECIMAL(15,2) NOT NULL,
            due_date INT NOT NULL,
            category_id INT DEFAULT NULL,
            user_category_id INT DEFAULT NULL,
            auto_pay BOOLEAN DEFAULT FALSE,
            reminder_days INT DEFAULT 3,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $db->exec("CREATE TABLE IF NOT EXISTS bill_payments (
            payment_id INT AUTO_INCREMENT PRIMARY KEY,
            bill_id INT NOT NULL,
            user_id INT NOT NULL,
            payment_date DATE NOT NULL,
            amount_paid DECIMAL(15,2) NOT NULL,
            payment_method VARCHAR(50) DEFAULT '',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bill_id) REFERENCES monthly_bills(bill_id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $db->exec("CREATE TABLE IF NOT EXISTS family_sharing (
            share_id INT AUTO_INCREMENT PRIMARY KEY,
            bill_id INT NOT NULL,
            owner_user_id INT NOT NULL,
            shared_with_user_id INT NOT NULL,
            share_percentage DECIMAL(5,2) DEFAULT 50.00,
            status ENUM('pending','accepted','declined') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bill_id) REFERENCES monthly_bills(bill_id) ON DELETE CASCADE,
            FOREIGN KEY (owner_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
            FOREIGN KEY (shared_with_user_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $db->exec("CREATE TABLE IF NOT EXISTS exchange_rates (
            rate_id INT AUTO_INCREMENT PRIMARY KEY,
            from_currency VARCHAR(10) NOT NULL,
            to_currency VARCHAR(10) NOT NULL,
            rate DECIMAL(15,6) NOT NULL,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_pair (from_currency, to_currency)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $db->exec("CREATE TABLE IF NOT EXISTS notifications (
            notification_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            notification_type ENUM('bill_reminder','budget_warning','goal_achieved','share_request') NOT NULL,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            related_id INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $db->exec("CREATE TABLE IF NOT EXISTS finance_history (
            history_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            transaction_type ENUM('income','expense','budget','goal','bill') NOT NULL,
            transaction_id INT NOT NULL,
            action_type ENUM('created','updated','deleted') NOT NULL,
            old_value TEXT,
            new_value TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }

    private function seedData() {
        $db = $this->connection;

        // Seed predefined categories if empty
        $count = $db->query("SELECT COUNT(*) FROM predefined_categories")->fetchColumn();
        if ($count == 0) {
            $db->exec("INSERT INTO predefined_categories (category_name, category_type, icon, color) VALUES
                ('Salary','income','briefcase','#00704A'),
                ('Freelance','income','laptop','#00704A'),
                ('Investment','income','trending-up','#00704A'),
                ('Business','income','shopping-bag','#00704A'),
                ('Gift','income','gift','#00704A'),
                ('Other Income','income','dollar-sign','#00704A'),
                ('Food & Dining','expense','utensils','#00704A'),
                ('Transportation','expense','car','#00704A'),
                ('Shopping','expense','shopping-cart','#00704A'),
                ('Entertainment','expense','film','#00704A'),
                ('Bills & Utilities','expense','file-text','#00704A'),
                ('Healthcare','expense','heart','#00704A'),
                ('Education','expense','book','#00704A'),
                ('Travel','expense','plane','#00704A'),
                ('Insurance','expense','shield','#00704A'),
                ('Housing','expense','home','#00704A'),
                ('Personal Care','expense','user','#00704A'),
                ('Other Expense','expense','more-horizontal','#00704A')");
        }

        // Seed exchange rates if empty
        $rateCount = $db->query("SELECT COUNT(*) FROM exchange_rates")->fetchColumn();
        if ($rateCount == 0) {
            // Full cross-currency rate matrix
            $allRates = [
                // USD base
                ['USD','EUR',0.9200],['USD','GBP',0.7900],['USD','JPY',149.5000],
                ['USD','PHP',56.5000],['USD','AUD',1.5300],['USD','CAD',1.3600],
                // Back to USD
                ['EUR','USD',1.0870],['GBP','USD',1.2660],['JPY','USD',0.006689],
                ['PHP','USD',0.01770],['AUD','USD',0.6536],['CAD','USD',0.7353],
                // EUR pairs
                ['EUR','GBP',0.8587],['EUR','JPY',162.5000],['EUR','PHP',61.4000],
                ['EUR','AUD',1.6630],['EUR','CAD',1.4790],
                ['GBP','EUR',1.1646],['JPY','EUR',0.006154],['PHP','EUR',0.01629],
                ['AUD','EUR',0.6013],['CAD','EUR',0.6761],
                // GBP pairs
                ['GBP','JPY',189.2000],['GBP','PHP',71.5000],['GBP','AUD',1.9360],
                ['GBP','CAD',1.7220],
                ['JPY','GBP',0.005285],['PHP','GBP',0.013986],['AUD','GBP',0.5165],
                ['CAD','GBP',0.5807],
                // JPY pairs
                ['JPY','PHP',0.3780],['JPY','AUD',0.01024],['JPY','CAD',0.009096],
                ['PHP','JPY',2.6460],['AUD','JPY',97.7100],['CAD','JPY',109.930],
                // PHP pairs
                ['PHP','AUD',0.02710],['PHP','CAD',0.02411],
                ['AUD','PHP',36.9100],['CAD','PHP',41.5400],
                // AUD/CAD
                ['AUD','CAD',0.8889],['CAD','AUD',1.1250],
            ];
            $rateStmt = $db->prepare("INSERT IGNORE INTO exchange_rates (from_currency,to_currency,rate) VALUES (?,?,?)");
            foreach ($allRates as $rate) { $rateStmt->execute($rate); }
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->connection;
    }

    private function __clone() {}
    public function __wakeup() { throw new Exception("Cannot unserialize singleton"); }
}

function getDB() {
    return Database::getInstance()->getConnection();
}
?>
