<?php
// Run once to add profile_picture column. Delete after.
require_once 'Database/config.php';
header('Content-Type: text/html');
echo "<h2>Add Profile Picture Column</h2>";
try {
    $db = getDB();
    // Check if column already exists
    $stmt = $db->query("SHOW COLUMNS FROM users LIKE 'profile_picture'");
    if ($stmt->fetch()) {
        echo "<p style='color:orange'>⚠️ Column already exists</p>";
    } else {
        $db->exec("ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255) DEFAULT NULL");
        echo "<p style='color:green'>✅ profile_picture column added</p>";
    }
    // Create uploads directory
    $uploadDir = __DIR__ . '/Frontend/uploads/avatars/';
    if (!is_dir($uploadDir)) { mkdir($uploadDir, 0755, true); echo "<p style='color:green'>✅ Uploads directory created</p>"; }
    else { echo "<p style='color:orange'>⚠️ Uploads directory already exists</p>"; }
    echo "<h3 style='color:green'>Done! <a href='Frontend/'>Go to CashFlow →</a></h3>";
    echo "<p style='color:red'>Delete this file after!</p>";
} catch(Exception $e) {
    echo "<p style='color:red'>Error: " . $e->getMessage() . "</p>";
}
?>
