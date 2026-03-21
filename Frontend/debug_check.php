<?php
// TEMPORARY DEBUG FILE - DELETE AFTER FIXING
// Visit: localhost/CashFlow/Frontend/debug_check.php
session_start();
header('Content-Type: text/html');

echo "<h2>CashFlow Debug Check</h2>";

// Check 1: Session
echo "<h3>1. Session Status</h3>";
if (isset($_SESSION['user_id'])) {
    echo "<p style='color:green'>✅ Logged in as user_id: " . $_SESSION['user_id'] . "</p>";
    echo "<p>Username: " . ($_SESSION['username'] ?? 'NOT SET') . "</p>";
    echo "<p>Theme: " . ($_SESSION['theme'] ?? 'NOT SET') . "</p>";
} else {
    echo "<p style='color:red'>❌ Not logged in - SESSION is empty</p>";
    echo "<p>This is why all API calls fail with 'Not authenticated'</p>";
    echo "<p><b>Fix: Log in again at localhost/CashFlow/Frontend/</b></p>";
}

// Check 2: Database connection
echo "<h3>2. Database Connection</h3>";
require_once '../Database/config.php';
try {
    $db = getDB();
    echo "<p style='color:green'>✅ Database connected</p>";
    
    // Check theme ENUM
    $stmt = $db->query("SHOW COLUMNS FROM users LIKE 'theme_preference'");
    $col = $stmt->fetch();
    echo "<p>Theme column type: <b>" . $col['Type'] . "</b></p>";
    if (strpos($col['Type'], 'starbucks') !== false) {
        echo "<p style='color:green'>✅ Theme ENUM includes starbucks/ocean</p>";
    } else {
        echo "<p style='color:red'>❌ Theme ENUM is OLD - run the ALTER TABLE fix!</p>";
        echo "<pre>ALTER TABLE users MODIFY COLUMN theme_preference ENUM('orange','dark','light','starbucks','ocean') DEFAULT 'starbucks';</pre>";
    }
    
    // Check user count
    $stmt = $db->query("SELECT COUNT(*) as cnt FROM users");
    echo "<p>Total users: " . $stmt->fetch()['cnt'] . "</p>";
    
} catch (Exception $e) {
    echo "<p style='color:red'>❌ DB Error: " . $e->getMessage() . "</p>";
}

// Check 3: Test summary API
echo "<h3>3. Test Summary API</h3>";
if (isset($_SESSION['user_id'])) {
    try {
        $user_id = $_SESSION['user_id'];
        $start = date('Y-m-01'); $end = date('Y-m-t');
        $stmt = $db->prepare("SELECT COALESCE(SUM(amount),0) as total FROM income WHERE user_id=? AND income_date BETWEEN ? AND ?");
        $stmt->execute([$user_id, $start, $end]);
        $income = $stmt->fetch()['total'];
        echo "<p style='color:green'>✅ Income query works: $" . $income . "</p>";
    } catch(Exception $e) {
        echo "<p style='color:red'>❌ Query failed: " . $e->getMessage() . "</p>";
    }
} else {
    echo "<p style='color:orange'>⚠️ Skipped (not logged in)</p>";
}

echo "<hr><p><b>After fixing, delete this file!</b></p>";
?>
