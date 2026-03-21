<?php
// Suppress PHP notices/warnings so they don't break JSON output
error_reporting(0);
ini_set('display_errors', 0);
/**
 * CashFlow Budget and Goals Handler
 */

session_start();
require_once '../Database/config.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit;
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'add_budget':
        addBudget();
        break;
    case 'get_budgets':
        getBudgets();
        break;
    case 'update_budget':
        updateBudget();
        break;
    case 'delete_budget':
        deleteBudget();
        break;
    case 'add_goal':
        addGoal();
        break;
    case 'get_goals':
        getGoals();
        break;
    case 'update_goal':
        updateGoal();
        break;
    case 'delete_goal':
        deleteGoal();
        break;
    case 'contribute_to_goal':
        contributeToGoal();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function addBudget() {
    try {
        $user_id = $_SESSION['user_id'];
        $category_id = $_POST['category_id'] ?? null;
        $user_category_id = $_POST['user_category_id'] ?? null;
        $budget_amount = floatval($_POST['budget_amount'] ?? 0);
        $period = $_POST['period'] ?? 'monthly';
        $start_date = $_POST['start_date'] ?? date('Y-m-01');
        $end_date = $_POST['end_date'] ?? date('Y-m-t');
        
        if ($budget_amount <= 0) {
            echo json_encode(['success' => false, 'message' => 'Invalid budget amount']);
            return;
        }
        
        $db = getDB();
        
        $stmt = $db->prepare("INSERT INTO budgets (user_id, category_id, user_category_id, budget_amount, period, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$user_id, $category_id, $user_category_id, $budget_amount, $period, $start_date, $end_date]);
        
        $budget_id = $db->lastInsertId();
        
        echo json_encode(['success' => true, 'message' => 'Budget created successfully', 'budget_id' => $budget_id]);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function getBudgets() {
    try {
        $user_id = $_SESSION['user_id'];
        $db = getDB();
        
        $stmt = $db->prepare("
            SELECT b.*,
                   COALESCE(pc.category_name, uc.category_name, 'Overall') as category_name,
                   COALESCE(pc.icon, uc.icon, 'wallet') as icon,
                   COALESCE(pc.color, uc.color, '#EB5002') as color,
                   COALESCE(SUM(e.amount), 0) as spent
            FROM budgets b
            LEFT JOIN predefined_categories pc ON b.category_id = pc.category_id
            LEFT JOIN user_categories uc ON b.user_category_id = uc.user_category_id
            LEFT JOIN expenses e ON e.user_id = b.user_id 
                AND (
                    (b.category_id IS NOT NULL AND e.category_id = b.category_id)
                    OR (b.user_category_id IS NOT NULL AND e.user_category_id = b.user_category_id)
                )
                AND e.expense_date BETWEEN b.start_date AND b.end_date
            WHERE b.user_id = ?
            GROUP BY b.budget_id
            ORDER BY b.created_at DESC
        ");
        $stmt->execute([$user_id]);
        $budgets = $stmt->fetchAll();
        
        // Calculate percentages
        foreach ($budgets as &$budget) {
            $budget['spent'] = floatval($budget['spent']);
            $budget['budget_amount'] = floatval($budget['budget_amount']);
            $budget['percentage'] = $budget['budget_amount'] > 0 ? 
                round(($budget['spent'] / $budget['budget_amount']) * 100, 2) : 0;
            $budget['remaining'] = $budget['budget_amount'] - $budget['spent'];
        }
        
        echo json_encode(['success' => true, 'budgets' => $budgets]);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function updateBudget() {
    try {
        $user_id = $_SESSION['user_id'];
        $budget_id = intval($_POST['budget_id'] ?? 0);
        $budget_amount = floatval($_POST['budget_amount'] ?? 0);
        
        $db = getDB();
        
        $stmt = $db->prepare("UPDATE budgets SET budget_amount = ? WHERE budget_id = ? AND user_id = ?");
        $stmt->execute([$budget_amount, $budget_id, $user_id]);
        
        echo json_encode(['success' => true, 'message' => 'Budget updated successfully']);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function deleteBudget() {
    try {
        $user_id = $_SESSION['user_id'];
        $budget_id = intval($_POST['budget_id'] ?? 0);
        
        $db = getDB();
        
        $stmt = $db->prepare("DELETE FROM budgets WHERE budget_id = ? AND user_id = ?");
        $stmt->execute([$budget_id, $user_id]);
        
        echo json_encode(['success' => true, 'message' => 'Budget deleted successfully']);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function addGoal() {
    try {
        $user_id = $_SESSION['user_id'];
        $goal_name = trim($_POST['goal_name'] ?? '');
        $target_amount = floatval($_POST['target_amount'] ?? 0);
        $deadline = $_POST['deadline'] ?? null;
        $priority = $_POST['priority'] ?? 'medium';
        
        if (empty($goal_name) || $target_amount <= 0) {
            echo json_encode(['success' => false, 'message' => 'Invalid goal data']);
            return;
        }
        
        $db = getDB();
        
        $stmt = $db->prepare("INSERT INTO savings_goals (user_id, goal_name, target_amount, deadline, priority) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$user_id, $goal_name, $target_amount, $deadline, $priority]);
        
        $goal_id = $db->lastInsertId();
        
        echo json_encode(['success' => true, 'message' => 'Savings goal created successfully', 'goal_id' => $goal_id]);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function getGoals() {
    try {
        $user_id = $_SESSION['user_id'];
        $status = $_GET['status'] ?? 'active';
        
        $db = getDB();
        
        $stmt = $db->prepare("
            SELECT * FROM savings_goals 
            WHERE user_id = ? AND status = ?
            ORDER BY 
                CASE priority 
                    WHEN 'high' THEN 1 
                    WHEN 'medium' THEN 2 
                    WHEN 'low' THEN 3 
                END,
                deadline ASC
        ");
        $stmt->execute([$user_id, $status]);
        $goals = $stmt->fetchAll();
        
        // Calculate progress
        foreach ($goals as &$goal) {
            $goal['target_amount'] = floatval($goal['target_amount']);
            $goal['current_amount'] = floatval($goal['current_amount']);
            $goal['percentage'] = $goal['target_amount'] > 0 ? 
                round(($goal['current_amount'] / $goal['target_amount']) * 100, 2) : 0;
            $goal['remaining'] = $goal['target_amount'] - $goal['current_amount'];
            
            // Calculate days remaining
            if ($goal['deadline']) {
                $days = (strtotime($goal['deadline']) - time()) / (60 * 60 * 24);
                $goal['days_remaining'] = max(0, ceil($days));
            } else {
                $goal['days_remaining'] = null;
            }
        }
        
        echo json_encode(['success' => true, 'goals' => $goals]);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function updateGoal() {
    try {
        $user_id = $_SESSION['user_id'];
        $goal_id = intval($_POST['goal_id'] ?? 0);
        $goal_name = trim($_POST['goal_name'] ?? '');
        $target_amount = floatval($_POST['target_amount'] ?? 0);
        $deadline = $_POST['deadline'] ?? null;
        $priority = $_POST['priority'] ?? 'medium';
        $status = $_POST['status'] ?? 'active';
        
        $db = getDB();
        
        $stmt = $db->prepare("UPDATE savings_goals SET goal_name = ?, target_amount = ?, deadline = ?, priority = ?, status = ? WHERE goal_id = ? AND user_id = ?");
        $stmt->execute([$goal_name, $target_amount, $deadline, $priority, $status, $goal_id, $user_id]);
        
        // If goal is completed, set completed_at
        if ($status === 'completed') {
            $stmt = $db->prepare("UPDATE savings_goals SET completed_at = NOW() WHERE goal_id = ? AND user_id = ?");
            $stmt->execute([$goal_id, $user_id]);
            
            // Create notification
            $stmt = $db->prepare("INSERT INTO notifications (user_id, notification_type, message, related_id) VALUES (?, 'goal_achieved', ?, ?)");
            $stmt->execute([$user_id, "Congratulations! You've achieved your goal: $goal_name", $goal_id]);
        }
        
        echo json_encode(['success' => true, 'message' => 'Goal updated successfully']);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function deleteGoal() {
    try {
        $user_id = $_SESSION['user_id'];
        $goal_id = intval($_POST['goal_id'] ?? 0);
        
        $db = getDB();
        
        $stmt = $db->prepare("DELETE FROM savings_goals WHERE goal_id = ? AND user_id = ?");
        $stmt->execute([$goal_id, $user_id]);
        
        echo json_encode(['success' => true, 'message' => 'Goal deleted successfully']);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function contributeToGoal() {
    try {
        $user_id = $_SESSION['user_id'];
        $goal_id = intval($_POST['goal_id'] ?? 0);
        $amount = floatval($_POST['amount'] ?? 0);
        
        if ($amount <= 0) {
            echo json_encode(['success' => false, 'message' => 'Invalid amount']);
            return;
        }
        
        $db = getDB();
        
        // Get current goal
        $stmt = $db->prepare("SELECT current_amount, target_amount, goal_name FROM savings_goals WHERE goal_id = ? AND user_id = ?");
        $stmt->execute([$goal_id, $user_id]);
        $goal = $stmt->fetch();
        
        if (!$goal) {
            echo json_encode(['success' => false, 'message' => 'Goal not found']);
            return;
        }
        
        $new_amount = $goal['current_amount'] + $amount;
        
        // Update goal
        $stmt = $db->prepare("UPDATE savings_goals SET current_amount = ? WHERE goal_id = ? AND user_id = ?");
        $stmt->execute([$new_amount, $goal_id, $user_id]);
        
        // Check if goal is achieved
        if ($new_amount >= $goal['target_amount']) {
            $stmt = $db->prepare("UPDATE savings_goals SET status = 'completed', completed_at = NOW() WHERE goal_id = ? AND user_id = ?");
            $stmt->execute([$goal_id, $user_id]);
            
            // Create notification
            $stmt = $db->prepare("INSERT INTO notifications (user_id, notification_type, message, related_id) VALUES (?, 'goal_achieved', ?, ?)");
            $stmt->execute([$user_id, "Congratulations! You've achieved your goal: {$goal['goal_name']}", $goal_id]);
        }
        
        echo json_encode(['success' => true, 'message' => 'Contribution added successfully', 'new_amount' => $new_amount]);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}
?>
