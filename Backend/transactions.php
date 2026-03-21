<?php
// Suppress PHP notices/warnings so they don't break JSON output
error_reporting(0);
ini_set('display_errors', 0);
/**
 * CashFlow Transactions Handler
 * Manages income and expense transactions
 */

session_start();
require_once '../Database/config.php';

header('Content-Type: application/json');

$action = $_POST['action'] ?? $_GET['action'] ?? '';

// Allow get_categories without auth (predefined cats are public)
// All other actions require authentication
if (!isset($_SESSION['user_id']) && $action !== 'get_categories') {
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

switch ($action) {
    case 'add_income':
        addIncome();
        break;
    case 'add_expense':
        addExpense();
        break;
    case 'get_transactions':
        getTransactions();
        break;
    case 'get_summary':
        getSummary();
        break;
    case 'update_transaction':
        updateTransaction();
        break;
    case 'delete_transaction':
        deleteTransaction();
        break;
    case 'get_categories':
        getCategories();
        break;
    case 'add_user_category':
        addUserCategory();
        break;
    case 'delete_user_category':
        deleteUserCategory();
        break;
    case 'export_csv':
        exportCSV();
        break;
    case 'edit_transaction':
        editTransaction();
        break;
    case 'get_monthly_trend':
        getMonthlyTrend();
        break;
    case 'get_comparison':
        getIncomeExpenseComparison();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function addIncome() {
    try {
        $user_id = $_SESSION['user_id'];
        $category_id = !empty($_POST['category_id']) ? $_POST['category_id'] : null;
        $user_category_id = !empty($_POST['user_category_id']) ? $_POST['user_category_id'] : null;
        $amount = floatval($_POST['amount'] ?? 0);
        $description = trim($_POST['description'] ?? '');
        $income_date = $_POST['income_date'] ?? date('Y-m-d');
        $recurring = isset($_POST['recurring']) ? 1 : 0;
        $recurring_frequency = $_POST['recurring_frequency'] ?? null;
        
        if ($amount <= 0) {
            echo json_encode(['success' => false, 'message' => 'Invalid amount']);
            return;
        }
        
        $db = getDB();
        
        $stmt = $db->prepare("INSERT INTO income (user_id, category_id, user_category_id, amount, description, income_date, recurring, recurring_frequency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$user_id, $category_id, $user_category_id, $amount, $description, $income_date, $recurring, $recurring_frequency]);
        
        $income_id = $db->lastInsertId();
        
        // Log to history
        logHistory($user_id, 'income', $income_id, 'created', null, json_encode($_POST));
        
        echo json_encode(['success' => true, 'message' => 'Income added successfully', 'income_id' => $income_id]);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function addExpense() {
    try {
        $user_id = $_SESSION['user_id'];
        $category_id = !empty($_POST['category_id']) ? $_POST['category_id'] : null;
        $user_category_id = !empty($_POST['user_category_id']) ? $_POST['user_category_id'] : null;
        $amount = floatval($_POST['amount'] ?? 0);
        $description = trim($_POST['description'] ?? '');
        $expense_date = $_POST['expense_date'] ?? date('Y-m-d');
        $recurring = isset($_POST['recurring']) ? 1 : 0;
        $recurring_frequency = $_POST['recurring_frequency'] ?? null;
        
        if ($amount <= 0) {
            echo json_encode(['success' => false, 'message' => 'Invalid amount']);
            return;
        }
        
        $db = getDB();
        
        $stmt = $db->prepare("INSERT INTO expenses (user_id, category_id, user_category_id, amount, description, expense_date, recurring, recurring_frequency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$user_id, $category_id, $user_category_id, $amount, $description, $expense_date, $recurring, $recurring_frequency]);
        
        $expense_id = $db->lastInsertId();
        
        // Log to history
        logHistory($user_id, 'expense', $expense_id, 'created', null, json_encode($_POST));
        
        // Check budget warnings
        checkBudgetWarnings($user_id, $category_id, $user_category_id);
        
        echo json_encode(['success' => true, 'message' => 'Expense added successfully', 'expense_id' => $expense_id]);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function getTransactions() {
    try {
        $user_id = $_SESSION['user_id'];
        $type = $_GET['type'] ?? 'all'; // all, income, expense
        $start_date = $_GET['start_date'] ?? date('Y-m-01');
        $end_date = $_GET['end_date'] ?? date('Y-m-t');
        $limit = intval($_GET['limit'] ?? 100);
        
        $db = getDB();
        $transactions = [];
        
        if ($type === 'all' || $type === 'income') {
            $stmt = $db->prepare("
                SELECT i.*, 
                       COALESCE(pc.category_name, uc.category_name) as category_name,
                       COALESCE(pc.icon, uc.icon) as icon,
                       'income' as type
                FROM income i
                LEFT JOIN predefined_categories pc ON i.category_id = pc.category_id
                LEFT JOIN user_categories uc ON i.user_category_id = uc.user_category_id
                WHERE i.user_id = ? AND i.income_date BETWEEN ? AND ?
                ORDER BY i.income_date DESC, i.created_at DESC
                LIMIT ?
            ");
            $stmt->execute([$user_id, $start_date, $end_date, $limit]);
            $transactions = array_merge($transactions, $stmt->fetchAll());
        }
        
        if ($type === 'all' || $type === 'expense') {
            $stmt = $db->prepare("
                SELECT e.*, 
                       COALESCE(pc.category_name, uc.category_name) as category_name,
                       COALESCE(pc.icon, uc.icon) as icon,
                       'expense' as type
                FROM expenses e
                LEFT JOIN predefined_categories pc ON e.category_id = pc.category_id
                LEFT JOIN user_categories uc ON e.user_category_id = uc.user_category_id
                WHERE e.user_id = ? AND e.expense_date BETWEEN ? AND ?
                ORDER BY e.expense_date DESC, e.created_at DESC
                LIMIT ?
            ");
            $stmt->execute([$user_id, $start_date, $end_date, $limit]);
            $transactions = array_merge($transactions, $stmt->fetchAll());
        }
        
        // Sort by date
        usort($transactions, function($a, $b) {
            $dateA = $a['income_date'] ?? $a['expense_date'];
            $dateB = $b['income_date'] ?? $b['expense_date'];
            return strtotime($dateB) - strtotime($dateA);
        });
        
        echo json_encode(['success' => true, 'transactions' => $transactions]);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function getSummary() {
    try {
        $user_id = $_SESSION['user_id'];
        $period = $_GET['period'] ?? 'month'; // month, year, all
        
        $db = getDB();
        
        // Calculate date range
        switch ($period) {
            case 'month':
                $start_date = date('Y-m-01');
                $end_date = date('Y-m-t');
                break;
            case 'year':
                $start_date = date('Y-01-01');
                $end_date = date('Y-12-31');
                break;
            default:
                $start_date = '2000-01-01';
                $end_date = '2099-12-31';
        }
        
        // Total income
        $stmt = $db->prepare("SELECT COALESCE(SUM(amount), 0) as total FROM income WHERE user_id = ? AND income_date BETWEEN ? AND ?");
        $stmt->execute([$user_id, $start_date, $end_date]);
        $total_income = $stmt->fetch()['total'];
        
        // Total expenses
        $stmt = $db->prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ? AND expense_date BETWEEN ? AND ?");
        $stmt->execute([$user_id, $start_date, $end_date]);
        $total_expenses = $stmt->fetch()['total'];
        
        // Balance
        $balance = $total_income - $total_expenses;
        
        // Category breakdown for expenses
        $stmt = $db->prepare("
            SELECT COALESCE(pc.category_name, uc.category_name, 'Uncategorized') as category,
                   SUM(e.amount) as total,
                   COALESCE(pc.color, uc.color, '#EB5002') as color
            FROM expenses e
            LEFT JOIN predefined_categories pc ON e.category_id = pc.category_id
            LEFT JOIN user_categories uc ON e.user_category_id = uc.user_category_id
            WHERE e.user_id = ? AND e.expense_date BETWEEN ? AND ?
            GROUP BY category, color
            ORDER BY total DESC
        ");
        $stmt->execute([$user_id, $start_date, $end_date]);
        $expense_by_category = $stmt->fetchAll();
        
        // Convert to user's preferred currency if needed
        $user_currency = $_SESSION['currency'] ?? 'PHP';
        $base_currency = 'USD';
        $conversion_rate = 1.0;
        try {
            if ($user_currency !== $base_currency) {
                $rate_stmt = $db->prepare("SELECT rate FROM exchange_rates WHERE from_currency = ? AND to_currency = ?");
                $rate_stmt->execute([$base_currency, $user_currency]);
                $rate_row = $rate_stmt->fetch();
                if ($rate_row) $conversion_rate = floatval($rate_row['rate']);
            }
        } catch (Exception $convErr) { $conversion_rate = 1.0; }
        $converted_income   = floatval($total_income)   * $conversion_rate;
        $converted_expenses = floatval($total_expenses) * $conversion_rate;
        $converted_balance  = floatval($balance)        * $conversion_rate;
        $converted_cats = array_map(function($cat) use ($conversion_rate) {
            $cat['total'] = floatval($cat['total']) * $conversion_rate;
            return $cat;
        }, $expense_by_category);

        echo json_encode([
            'success' => true,
            'summary' => [
                'total_income' => $converted_income,
                'total_expenses' => $converted_expenses,
                'balance' => $converted_balance,
                'period' => $period,
                'start_date' => $start_date,
                'end_date' => $end_date,
                'expense_by_category' => $converted_cats,
                'currency' => $user_currency,
                'conversion_rate' => $conversion_rate
            ]
        ]);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function getCategories() {
    try {
        $type = $_GET['type'] ?? 'all';
        $db = getDB();

        // Get predefined categories (no auth needed)
        if ($type === 'all') {
            $stmt = $db->prepare("SELECT * FROM predefined_categories ORDER BY category_name ASC");
            $stmt->execute();
        } else {
            $stmt = $db->prepare("SELECT * FROM predefined_categories WHERE category_type = ? ORDER BY category_name ASC");
            $stmt->execute([$type]);
        }
        $predefined = $stmt->fetchAll();

        // Get user categories (only if logged in)
        $user_defined = [];
        $user_id = $_SESSION['user_id'] ?? null;
        if ($user_id) {
            if ($type === 'all') {
                $stmt = $db->prepare("SELECT * FROM user_categories WHERE user_id = ? ORDER BY category_name ASC");
                $stmt->execute([$user_id]);
            } else {
                $stmt = $db->prepare("SELECT * FROM user_categories WHERE user_id = ? AND category_type = ? ORDER BY category_name ASC");
                $stmt->execute([$user_id, $type]);
            }
            $user_defined = $stmt->fetchAll();
        }

        echo json_encode([
            'success' => true,
            'categories' => [
                'predefined'  => $predefined,
                'user_defined' => $user_defined
            ]
        ]);

    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function addUserCategory() {
    try {
        $user_id = $_SESSION['user_id'];
        $category_name = trim($_POST['category_name'] ?? '');
        $category_type = $_POST['category_type'] ?? 'expense';
        $icon = $_POST['icon'] ?? 'default';
        $color = $_POST['color'] ?? '#EB5002';
        
        if (empty($category_name)) {
            echo json_encode(['success' => false, 'message' => 'Category name is required']);
            return;
        }
        
        $db = getDB();
        
        $stmt = $db->prepare("INSERT INTO user_categories (user_id, category_name, category_type, icon, color) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$user_id, $category_name, $category_type, $icon, $color]);
        
        $category_id = $db->lastInsertId();
        
        echo json_encode(['success' => true, 'message' => 'Category added successfully', 'category_id' => $category_id]);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function deleteUserCategory() {
    try {
        $user_id = $_SESSION['user_id'];
        $user_category_id = intval($_POST['user_category_id'] ?? 0);

        if ($user_category_id <= 0) {
            echo json_encode(['success' => false, 'message' => 'Invalid category']);
            return;
        }

        $db = getDB();

        // Only delete if it belongs to this user
        $stmt = $db->prepare("DELETE FROM user_categories WHERE user_category_id = ? AND user_id = ?");
        $stmt->execute([$user_category_id, $user_id]);

        if ($stmt->rowCount() === 0) {
            echo json_encode(['success' => false, 'message' => 'Category not found or not yours']);
            return;
        }

        echo json_encode(['success' => true, 'message' => 'Category deleted successfully']);

    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function getIncomeExpenseComparison() {
    try {
        $user_id = $_SESSION['user_id'];
        $months = intval($_GET['months'] ?? 6);
        
        $db = getDB();
        $comparison = [];
        
        for ($i = $months - 1; $i >= 0; $i--) {
            $month = date('Y-m', strtotime("-$i months"));
            $start_date = $month . '-01';
            $end_date = date('Y-m-t', strtotime($start_date));
            
            // Get income
            $stmt = $db->prepare("SELECT COALESCE(SUM(amount), 0) as total FROM income WHERE user_id = ? AND income_date BETWEEN ? AND ?");
            $stmt->execute([$user_id, $start_date, $end_date]);
            $income = $stmt->fetch()['total'];
            
            // Get expenses
            $stmt = $db->prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ? AND expense_date BETWEEN ? AND ?");
            $stmt->execute([$user_id, $start_date, $end_date]);
            $expenses = $stmt->fetch()['total'];
            
            $comparison[] = [
                'month' => date('M Y', strtotime($month)),
                'income' => floatval($income),
                'expenses' => floatval($expenses),
                'net' => floatval($income - $expenses)
            ];
        }
        
        echo json_encode(['success' => true, 'comparison' => $comparison]);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function updateTransaction() {
    try {
        $user_id = $_SESSION['user_id'];
        $transaction_id = intval($_POST['transaction_id'] ?? 0);
        $type = $_POST['type'] ?? '';
        $amount = floatval($_POST['amount'] ?? 0);
        $description = trim($_POST['description'] ?? '');
        $date = $_POST['date'] ?? date('Y-m-d');
        
        $db = getDB();
        
        if ($type === 'income') {
            $stmt = $db->prepare("UPDATE income SET amount = ?, description = ?, income_date = ? WHERE income_id = ? AND user_id = ?");
            $stmt->execute([$amount, $description, $date, $transaction_id, $user_id]);
        } else {
            $stmt = $db->prepare("UPDATE expenses SET amount = ?, description = ?, expense_date = ? WHERE expense_id = ? AND user_id = ?");
            $stmt->execute([$amount, $description, $date, $transaction_id, $user_id]);
        }
        
        logHistory($user_id, $type, $transaction_id, 'updated', null, json_encode($_POST));
        
        echo json_encode(['success' => true, 'message' => 'Transaction updated successfully']);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function deleteTransaction() {
    try {
        $user_id = $_SESSION['user_id'];
        $transaction_id = intval($_POST['transaction_id'] ?? 0);
        $type = $_POST['type'] ?? '';
        
        $db = getDB();
        
        if ($type === 'income') {
            $stmt = $db->prepare("DELETE FROM income WHERE income_id = ? AND user_id = ?");
        } else {
            $stmt = $db->prepare("DELETE FROM expenses WHERE expense_id = ? AND user_id = ?");
        }
        $stmt->execute([$transaction_id, $user_id]);
        
        logHistory($user_id, $type, $transaction_id, 'deleted', null, null);
        
        echo json_encode(['success' => true, 'message' => 'Transaction deleted successfully']);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function logHistory($user_id, $type, $transaction_id, $action, $old_value, $new_value) {
    try {
        $db = getDB();
        $stmt = $db->prepare("INSERT INTO finance_history (user_id, transaction_type, transaction_id, action_type, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$user_id, $type, $transaction_id, $action, $old_value, $new_value]);
    } catch (PDOException $e) {
        // Silent fail for history logging
    }
}

function checkBudgetWarnings($user_id, $category_id, $user_category_id) {
    try {
        $db = getDB();
        $current_month_start = date('Y-m-01');
        $current_month_end = date('Y-m-t');
        
        // Check if there's a budget for this category
        $stmt = $db->prepare("
            SELECT budget_id, budget_amount 
            FROM budgets 
            WHERE user_id = ? 
            AND (category_id = ? OR user_category_id = ?)
            AND start_date <= ? AND end_date >= ?
        ");
        $stmt->execute([$user_id, $category_id, $user_category_id, $current_month_start, $current_month_end]);
        $budget = $stmt->fetch();
        
        if ($budget) {
            // Calculate total expenses for this category
            $stmt = $db->prepare("
                SELECT COALESCE(SUM(amount), 0) as total
                FROM expenses
                WHERE user_id = ?
                AND (category_id = ? OR user_category_id = ?)
                AND expense_date BETWEEN ? AND ?
            ");
            $stmt->execute([$user_id, $category_id, $user_category_id, $current_month_start, $current_month_end]);
            $total_spent = $stmt->fetch()['total'];
            
            // If over 80% of budget, create notification
            if ($total_spent >= ($budget['budget_amount'] * 0.8)) {
                $percentage = round(($total_spent / $budget['budget_amount']) * 100);
                $message = "You've spent {$percentage}% of your budget for this category";
                
                $stmt = $db->prepare("INSERT INTO notifications (user_id, notification_type, message, related_id) VALUES (?, 'budget_warning', ?, ?)");
                $stmt->execute([$user_id, $message, $budget['budget_id']]);
            }
        }
    } catch (PDOException $e) {
        // Silent fail
    }
}

function exportCSV() {
    $user_id = $_SESSION['user_id'];
    $start_date = $_GET['start_date'] ?? date('Y-01-01');
    $end_date   = $_GET['end_date']   ?? date('Y-m-d');
    $db = getDB();
    $rows = [];
    $stmt = $db->prepare("SELECT i.income_date as date,'income' as type,COALESCE(pc.category_name,uc.category_name,'Uncategorized') as category,i.description,i.amount FROM income i LEFT JOIN predefined_categories pc ON i.category_id=pc.category_id LEFT JOIN user_categories uc ON i.user_category_id=uc.user_category_id WHERE i.user_id=? AND i.income_date BETWEEN ? AND ? UNION ALL SELECT e.expense_date,'expense',COALESCE(pc2.category_name,uc2.category_name,'Uncategorized'),e.description,e.amount FROM expenses e LEFT JOIN predefined_categories pc2 ON e.category_id=pc2.category_id LEFT JOIN user_categories uc2 ON e.user_category_id=uc2.user_category_id WHERE e.user_id=? AND e.expense_date BETWEEN ? AND ? ORDER BY date DESC");
    $stmt->execute([$user_id,$start_date,$end_date,$user_id,$start_date,$end_date]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    // Return as JSON (frontend builds the CSV)
    echo json_encode(['success'=>true,'rows'=>$rows,'start_date'=>$start_date,'end_date'=>$end_date]);
}

function editTransaction() {
    $user_id = $_SESSION['user_id'];
    $type   = $_POST['type'] ?? '';
    $id     = intval($_POST['transaction_id'] ?? 0);
    $amount = floatval($_POST['amount'] ?? 0);
    $description = trim($_POST['description'] ?? '');
    $date   = $_POST['date'] ?? date('Y-m-d');
    $category_id      = !empty($_POST['category_id'])      ? $_POST['category_id']      : null;
    $user_category_id = !empty($_POST['user_category_id']) ? $_POST['user_category_id'] : null;
    if ($amount <= 0) { echo json_encode(['success'=>false,'message'=>'Invalid amount']); return; }
    $db = getDB();
    if ($type === 'income') {
        $stmt = $db->prepare("UPDATE income SET amount=?,description=?,income_date=?,category_id=?,user_category_id=? WHERE income_id=? AND user_id=?");
        $stmt->execute([$amount,$description,$date,$category_id,$user_category_id,$id,$user_id]);
    } else {
        $stmt = $db->prepare("UPDATE expenses SET amount=?,description=?,expense_date=?,category_id=?,user_category_id=? WHERE expense_id=? AND user_id=?");
        $stmt->execute([$amount,$description,$date,$category_id,$user_category_id,$id,$user_id]);
    }
    echo json_encode(['success'=>true,'message'=>'Transaction updated']);
}

function getMonthlyTrend() {
    $user_id = $_SESSION['user_id'];
    $months  = intval($_GET['months'] ?? 12);
    $db = getDB();
    $result = [];
    for ($i = $months - 1; $i >= 0; $i--) {
        $month_start = date('Y-m-01', strtotime("-$i months"));
        $month_end   = date('Y-m-t',  strtotime($month_start));
        $month_label = date('M Y',    strtotime($month_start));
        $stmt = $db->prepare("SELECT COALESCE(SUM(amount),0) FROM income WHERE user_id=? AND income_date BETWEEN ? AND ?");
        $stmt->execute([$user_id,$month_start,$month_end]);
        $inc = floatval($stmt->fetchColumn());
        $stmt = $db->prepare("SELECT COALESCE(SUM(amount),0) FROM expenses WHERE user_id=? AND expense_date BETWEEN ? AND ?");
        $stmt->execute([$user_id,$month_start,$month_end]);
        $exp = floatval($stmt->fetchColumn());
        $result[] = ['month'=>$month_label,'income'=>$inc,'expenses'=>$exp,'net'=>$inc-$exp];
    }
    echo json_encode(['success'=>true,'trend'=>$result]);
}
