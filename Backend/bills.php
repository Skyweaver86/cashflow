<?php
// Suppress PHP notices/warnings so they don't break JSON output
error_reporting(0);
ini_set('display_errors', 0);
/**
 * CashFlow Bills and Family Sharing Handler
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
    case 'add_bill':
        addBill();
        break;
    case 'get_bills':
        getBills();
        break;
    case 'update_bill':
        updateBill();
        break;
    case 'delete_bill':
        deleteBill();
        break;
    case 'pay_bill':
        payBill();
        break;
    case 'get_bill_report':
        getBillReport();
        break;
    case 'share_bill':
        shareBill();
        break;
    case 'get_shared_bills':
        getSharedBills();
        break;
    case 'respond_to_share':
        respondToShare();
        break;
    case 'get_bill_history':
        getBillHistory();
        break;
    case 'get_notifications':
        getNotifications();
        break;
    case 'mark_notification_read':
        markNotificationRead();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function addBill() {
    try {
        $user_id = $_SESSION['user_id'];
        $bill_name = trim($_POST['bill_name'] ?? '');
        $amount = floatval($_POST['amount'] ?? 0);
        $due_date = intval($_POST['due_date'] ?? 1);
        $cat_raw = $_POST['category_id'] ?? '';
        $category_id = null;
        $user_category_id = null;
        if (strpos($cat_raw, 'pred_') === 0) {
            $category_id = intval(str_replace('pred_', '', $cat_raw));
        } elseif (strpos($cat_raw, 'user_') === 0) {
            $user_category_id = intval(str_replace('user_', '', $cat_raw));
        } elseif (is_numeric($cat_raw) && $cat_raw !== '') {
            $category_id = intval($cat_raw); // legacy plain int
        }
        $auto_pay = isset($_POST['auto_pay']) ? 1 : 0;
        $reminder_days = intval($_POST['reminder_days'] ?? 3);
        $notes = trim($_POST['notes'] ?? '');
        
        if (empty($bill_name) || $amount <= 0) {
            echo json_encode(['success' => false, 'message' => 'Invalid bill data']);
            return;
        }
        
        $db = getDB();
        
        $stmt = $db->prepare("INSERT INTO monthly_bills (user_id, bill_name, amount, due_date, category_id, user_category_id, auto_pay, reminder_days, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$user_id, $bill_name, $amount, $due_date, $category_id, $user_category_id, $auto_pay, $reminder_days, $notes]);
        
        $bill_id = $db->lastInsertId();
        
        echo json_encode(['success' => true, 'message' => 'Bill created successfully', 'bill_id' => $bill_id]);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function getBills() {
    try {
        $user_id = $_SESSION['user_id'];
        $month = $_GET['month'] ?? date('Y-m');
        
        $db = getDB();
        
        $stmt = $db->prepare("
            SELECT b.*,
                   COALESCE(pc.category_name, uc.category_name, 'Uncategorized') as category_name,
                   COALESCE(pc.icon, uc.icon, 'file-text') as icon,
                   COALESCE(pc.color, uc.color, '#EB5002') as color
            FROM monthly_bills b
            LEFT JOIN predefined_categories pc ON b.category_id = pc.category_id
            LEFT JOIN user_categories uc ON b.user_category_id = uc.user_category_id
            WHERE b.user_id = ?
            ORDER BY b.due_date ASC
        ");
        $stmt->execute([$user_id]);
        $bills = $stmt->fetchAll();
        
        // Check payment status for current month
        foreach ($bills as &$bill) {
            $month_start = $month . '-01';
            $month_end   = date('Y-m-t', strtotime($month_start));
            $due_day     = str_pad($bill['due_date'], 2, '0', STR_PAD_LEFT);
            $payment_date = $month . '-' . $due_day;

            // Paid = any payment recorded for this bill within the current month
            $stmt = $db->prepare("SELECT payment_id FROM bill_payments WHERE bill_id = ? AND payment_date BETWEEN ? AND ?");
            $stmt->execute([$bill['bill_id'], $month_start, $month_end]);
            $bill['is_paid'] = $stmt->fetch() ? true : false;

            // Calculate days until due
            $due_timestamp = strtotime($payment_date);
            $today = strtotime(date('Y-m-d'));
            $bill['days_until_due'] = ceil(($due_timestamp - $today) / (60 * 60 * 24));
            $bill['is_overdue'] = $bill['days_until_due'] < 0 && !$bill['is_paid'];
        }
        
        echo json_encode(['success' => true, 'bills' => $bills]);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function updateBill() {
    try {
        $user_id = $_SESSION['user_id'];
        $bill_id = intval($_POST['bill_id'] ?? 0);
        $bill_name = trim($_POST['bill_name'] ?? '');
        $amount = floatval($_POST['amount'] ?? 0);
        $due_date = intval($_POST['due_date'] ?? 1);
        $auto_pay = isset($_POST['auto_pay']) ? 1 : 0;
        $notes = trim($_POST['notes'] ?? '');
        
        $db = getDB();
        
        $stmt = $db->prepare("UPDATE monthly_bills SET bill_name = ?, amount = ?, due_date = ?, auto_pay = ?, notes = ? WHERE bill_id = ? AND user_id = ?");
        $stmt->execute([$bill_name, $amount, $due_date, $auto_pay, $notes, $bill_id, $user_id]);
        
        echo json_encode(['success' => true, 'message' => 'Bill updated successfully']);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function deleteBill() {
    try {
        $user_id = $_SESSION['user_id'];
        $bill_id = intval($_POST['bill_id'] ?? 0);
        
        $db = getDB();
        
        // Verify bill belongs to user before deleting
        $stmt = $db->prepare("SELECT bill_id FROM monthly_bills WHERE bill_id = ? AND user_id = ?");
        $stmt->execute([$bill_id, $user_id]);
        if (!$stmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Bill not found']);
            return;
        }
        
        // Cascade delete: remove all payments for this bill first
        $stmt = $db->prepare("DELETE FROM bill_payments WHERE bill_id = ?");
        $stmt->execute([$bill_id]);
        
        // Also remove any family sharing records
        $stmt = $db->prepare("DELETE FROM family_sharing WHERE bill_id = ?");
        $stmt->execute([$bill_id]);
        
        // Now delete the bill itself
        $stmt = $db->prepare("DELETE FROM monthly_bills WHERE bill_id = ? AND user_id = ?");
        $stmt->execute([$bill_id, $user_id]);
        
        echo json_encode(['success' => true, 'message' => 'Bill deleted successfully']);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function payBill() {
    try {
        $user_id = $_SESSION['user_id'];
        $bill_id = intval($_POST['bill_id'] ?? 0);
        $payment_date = $_POST['payment_date'] ?? date('Y-m-d');
        $amount_paid = floatval($_POST['amount_paid'] ?? 0);
        $payment_method = trim($_POST['payment_method'] ?? '');
        $notes = trim($_POST['notes'] ?? '');
        
        $db = getDB();
        
        // Record payment
        $stmt = $db->prepare("INSERT INTO bill_payments (bill_id, user_id, payment_date, amount_paid, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$bill_id, $user_id, $payment_date, $amount_paid, $payment_method, $notes]);
        
        // Also add to expenses
        $stmt = $db->prepare("SELECT category_id, user_category_id, bill_name FROM monthly_bills WHERE bill_id = ?");
        $stmt->execute([$bill_id]);
        $bill = $stmt->fetch();
        
        $stmt = $db->prepare("INSERT INTO expenses (user_id, category_id, user_category_id, amount, description, expense_date) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$user_id, $bill['category_id'], $bill['user_category_id'], $amount_paid, 'Bill Payment: ' . $bill['bill_name'], $payment_date]);
        
        echo json_encode(['success' => true, 'message' => 'Bill payment recorded successfully']);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function getBillReport() {
    try {
        $user_id = $_SESSION['user_id'];
        $start_month = $_GET['start_month'] ?? date('Y-m', strtotime('-5 months'));
        $end_month = $_GET['end_month'] ?? date('Y-m');
        
        $db = getDB();
        
        $report = [];
        $current = $start_month;
        
        while (strtotime($current) <= strtotime($end_month)) {
            $month_start = $current . '-01';
            $month_end = date('Y-m-t', strtotime($month_start));
            
            // Get total bills
            $stmt = $db->prepare("SELECT COUNT(*) as total_bills, SUM(amount) as total_amount FROM monthly_bills WHERE user_id = ?");
            $stmt->execute([$user_id]);
            $bills_data = $stmt->fetch();
            
            // Get paid bills
            $stmt = $db->prepare("
                SELECT COUNT(DISTINCT bp.bill_id) as paid_bills, SUM(bp.amount_paid) as paid_amount
                FROM bill_payments bp
                WHERE bp.user_id = ? AND bp.payment_date BETWEEN ? AND ?
            ");
            $stmt->execute([$user_id, $month_start, $month_end]);
            $paid_data = $stmt->fetch();
            
            $report[] = [
                'month' => date('M Y', strtotime($current)),
                'total_bills' => intval($bills_data['total_bills']),
                'total_amount' => floatval($bills_data['total_amount']),
                'paid_bills' => intval($paid_data['paid_bills']),
                'paid_amount' => floatval($paid_data['paid_amount']),
                'unpaid_amount' => floatval($bills_data['total_amount']) - floatval($paid_data['paid_amount'])
            ];
            
            $current = date('Y-m', strtotime($current . '-01 +1 month'));
        }
        
        echo json_encode(['success' => true, 'report' => $report]);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function shareBill() {
    try {
        $user_id = $_SESSION['user_id'];
        $bill_id = intval($_POST['bill_id'] ?? 0);
        $share_with_username = trim($_POST['share_with_username'] ?? '');
        $share_percentage = floatval($_POST['share_percentage'] ?? 50.00);
        
        $db = getDB();
        
        // Find user by username or email
        $stmt = $db->prepare("SELECT user_id FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$share_with_username, $share_with_username]);
        $shared_user = $stmt->fetch();
        
        if (!$shared_user) {
            echo json_encode(['success' => false, 'message' => 'User not found']);
            return;
        }
        
        if ($shared_user['user_id'] == $user_id) {
            echo json_encode(['success' => false, 'message' => 'Cannot share with yourself']);
            return;
        }
        
        // Get bill details first
        $stmt = $db->prepare("SELECT bill_name FROM monthly_bills WHERE bill_id = ? AND user_id = ?");
        $stmt->execute([$bill_id, $user_id]);
        $bill = $stmt->fetch();
        if (!$bill) {
            echo json_encode(['success' => false, 'message' => 'Bill not found or not yours']);
            return;
        }

        // Create share request
        $stmt = $db->prepare("INSERT INTO family_sharing (bill_id, owner_user_id, shared_with_user_id, share_percentage) VALUES (?, ?, ?, ?)");
        $stmt->execute([$bill_id, $user_id, $shared_user['user_id'], $share_percentage]);
        $share_id = $db->lastInsertId();
        
        // Create notification for the shared user (use share_id as related_id)
        $owner_name = $_SESSION['full_name'] ?? $_SESSION['username'];
        $message = "{$owner_name} wants to share '{$bill['bill_name']}' with you ({$share_percentage}% = " . number_format(floatval($share_percentage), 1) . "%)";
        $stmt = $db->prepare("INSERT INTO notifications (user_id, notification_type, message, related_id) VALUES (?, 'share_request', ?, ?)");
        $stmt->execute([$shared_user['user_id'], $message, $share_id]);
        
        echo json_encode(['success' => true, 'message' => 'Bill share request sent successfully']);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function getSharedBills() {
    try {
        $user_id = $_SESSION['user_id'];
        $db = getDB();

        // Bills I own and shared with others
        $stmt = $db->prepare("
            SELECT fs.share_id, fs.share_percentage, fs.status, fs.created_at,
                   b.bill_id, b.bill_name, b.amount, b.due_date,
                   u.username as shared_with_username,
                   u.full_name as shared_with_fullname
            FROM family_sharing fs
            JOIN monthly_bills b ON fs.bill_id = b.bill_id
            JOIN users u ON fs.shared_with_user_id = u.user_id
            WHERE fs.owner_user_id = ?
            ORDER BY fs.created_at DESC
        ");
        $stmt->execute([$user_id]);
        $owned_shares = $stmt->fetchAll();

        // Bills shared with me (received)
        $stmt = $db->prepare("
            SELECT fs.share_id, fs.share_percentage, fs.status, fs.created_at,
                   b.bill_id, b.bill_name, b.amount, b.due_date,
                   u.username as owner_username,
                   u.full_name as owner_fullname
            FROM family_sharing fs
            JOIN monthly_bills b ON fs.bill_id = b.bill_id
            JOIN users u ON fs.owner_user_id = u.user_id
            WHERE fs.shared_with_user_id = ?
            ORDER BY fs.created_at DESC
        ");
        $stmt->execute([$user_id]);
        $received_shares = $stmt->fetchAll();

        echo json_encode([
            'success' => true,
            'owned_shares' => $owned_shares,
            'received_shares' => $received_shares
        ]);

    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function respondToShare() {
    try {
        $user_id = $_SESSION['user_id'];
        $share_id = intval($_POST['share_id'] ?? 0);
        $response = $_POST['response'] ?? ''; // 'accepted' or 'declined'
        
        if (!in_array($response, ['accepted', 'declined'])) {
            echo json_encode(['success' => false, 'message' => 'Invalid response']);
            return;
        }
        
        $db = getDB();
        
        $stmt = $db->prepare("UPDATE family_sharing SET status = ? WHERE share_id = ? AND shared_with_user_id = ?");
        $stmt->execute([$response, $share_id, $user_id]);
        
        echo json_encode(['success' => true, 'message' => 'Response recorded successfully']);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function getNotifications() {
    try {
        $user_id = $_SESSION['user_id'];
        $unread_only = isset($_GET['unread_only']) && $_GET['unread_only'] == '1';
        
        $db = getDB();
        
        if ($unread_only) {
            $stmt = $db->prepare("SELECT * FROM notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC LIMIT 50");
        } else {
            $stmt = $db->prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50");
        }
        $stmt->execute([$user_id]);
        $notifications = $stmt->fetchAll();
        
        echo json_encode(['success' => true, 'notifications' => $notifications]);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function markNotificationRead() {
    try {
        $user_id = $_SESSION['user_id'];
        $notification_id = intval($_POST['notification_id'] ?? 0);
        
        $db = getDB();
        
        if ($notification_id > 0) {
            $stmt = $db->prepare("UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?");
            $stmt->execute([$notification_id, $user_id]);
        } else {
            // Mark all as read
            $stmt = $db->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?");
            $stmt->execute([$user_id]);
        }
        
        echo json_encode(['success' => true, 'message' => 'Notification(s) marked as read']);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function getBillHistory() {
    $user_id = $_SESSION['user_id'];
    $bill_id = intval($_GET['bill_id'] ?? 0);
    $db = getDB();
    if ($bill_id > 0) {
        $stmt = $db->prepare("SELECT bp.*,mb.bill_name FROM bill_payments bp JOIN monthly_bills mb ON bp.bill_id=mb.bill_id WHERE bp.user_id=? AND bp.bill_id=? ORDER BY bp.payment_date DESC LIMIT 24");
        $stmt->execute([$user_id,$bill_id]);
    } else {
        $stmt = $db->prepare("SELECT bp.*,mb.bill_name FROM bill_payments bp JOIN monthly_bills mb ON bp.bill_id=mb.bill_id WHERE bp.user_id=? ORDER BY bp.payment_date DESC LIMIT 50");
        $stmt->execute([$user_id]);
    }
    echo json_encode(['success'=>true,'history'=>$stmt->fetchAll()]);
}
