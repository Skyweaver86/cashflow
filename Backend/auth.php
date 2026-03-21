<?php
// Suppress PHP notices/warnings so they don't break JSON output
error_reporting(0);
ini_set('display_errors', 0);
/**
 * CashFlow Authentication Handler
 * Handles user registration, login, and session management
 */

session_start();

try {
    require_once '../Database/config.php';
} catch (Exception $e) {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Database configuration error: ' . $e->getMessage()]);
    exit;
}

header('Content-Type: application/json');

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'register':
        register();
        break;
    case 'login':
        login();
        break;
    case 'logout':
        logout();
        break;
    case 'check_session':
        checkSession();
        break;
    case 'update_profile':
        updateProfile();
        break;
    case 'change_password':
        changePassword();
        break;
    case 'upload_avatar':
        uploadAvatar();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function register() {
    try {
        $username = trim($_POST['username'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';
        $full_name = trim($_POST['full_name'] ?? '');
        $currency = $_POST['currency'] ?? 'USD';
        
        // Validation
        if (empty($username) || empty($email) || empty($password) || empty($full_name)) {
            echo json_encode(['success' => false, 'message' => 'All fields are required']);
            return;
        }
        
        if (strlen($password) < 6) {
            echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters']);
            return;
        }
        
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'Invalid email format']);
            return;
        }
        
        $db = getDB();
        
        // Check if username or email already exists
        $stmt = $db->prepare("SELECT user_id FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$username, $email]);
        
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Username or email already exists']);
            return;
        }
        
        // Hash password
        $password_hash = password_hash($password, PASSWORD_DEFAULT);
        
        // Insert new user
        $stmt = $db->prepare("INSERT INTO users (username, email, password_hash, full_name, currency) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$username, $email, $password_hash, $full_name, $currency]);
        
        $user_id = $db->lastInsertId();
        
        // Set session
        $_SESSION['user_id'] = $user_id;
        $_SESSION['username'] = $username;
        $_SESSION['full_name'] = $full_name;
        $_SESSION['currency'] = $currency;
        $_SESSION['theme'] = 'starbucks';
        $_SESSION['email'] = $email;
        
        echo json_encode([
            'success' => true,
            'message' => 'Registration successful',
            'user' => [
                'user_id' => $user_id,
                'username' => $username,
                'email' => $email,
                'full_name' => $full_name,
                'currency' => $currency,
                'theme' => 'starbucks'
            ]
        ]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

function login() {
    try {
        $username = trim($_POST['username'] ?? '');
        $password = $_POST['password'] ?? '';
        
        if (empty($username) || empty($password)) {
            echo json_encode(['success' => false, 'message' => 'Username and password are required']);
            return;
        }
        
        $db = getDB();
        
        $stmt = $db->prepare("SELECT user_id, username, email, password_hash, full_name, currency, theme_preference, profile_picture FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$username, $username]);
        $user = $stmt->fetch();
        
        if (!$user || !password_verify($password, $user['password_hash'])) {
            echo json_encode(['success' => false, 'message' => 'Invalid username or password']);
            return;
        }
        
        // Update last login
        $stmt = $db->prepare("UPDATE users SET last_login = NOW() WHERE user_id = ?");
        $stmt->execute([$user['user_id']]);
        
        // Set session
        $_SESSION['user_id'] = $user['user_id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['full_name'] = $user['full_name'];
        $_SESSION['currency'] = $user['currency'];
        $theme = in_array($user['theme_preference'] ?? '', ['starbucks','ocean','dark','light','orange']) 
            ? $user['theme_preference'] : 'starbucks';
        $_SESSION['theme'] = $theme;
        $_SESSION['email'] = $user['email'];
        $_SESSION['profile_picture'] = $user['profile_picture'] ?? null;
        
        echo json_encode([
            'success' => true,
            'message' => 'Login successful',
            'user' => [
                'user_id' => $user['user_id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'full_name' => $user['full_name'],
                'currency' => $user['currency'],
                'theme' => $theme,
                'profile_picture' => $user['profile_picture'] ?? null
            ]
        ]);
        
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
    }
}

function logout() {
    session_destroy();
    echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
}

function checkSession() {
    if (isset($_SESSION['user_id'])) {
        echo json_encode([
            'success' => true,
            'logged_in' => true,
            'user' => [
                'user_id' => $_SESSION['user_id'],
                'username' => $_SESSION['username'],
                'full_name' => $_SESSION['full_name'],
                'email' => $_SESSION['email'] ?? '',
                'currency' => $_SESSION['currency'],
                'theme' => (in_array($_SESSION['theme'] ?? '', ['starbucks','ocean']) ? $_SESSION['theme'] : 'starbucks'),
                'profile_picture' => $_SESSION['profile_picture'] ?? null
            ]
        ]);
    } else {
        echo json_encode(['success' => true, 'logged_in' => false]);
    }
}

function updateProfile() {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Not authenticated']);
        return;
    }
    
    try {
        $user_id = $_SESSION['user_id'];
        $full_name = trim($_POST['full_name'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $currency = $_POST['currency'] ?? 'USD';
        $theme_raw = $_POST['theme'] ?? 'starbucks';
        // Map old theme names to new ones, default to starbucks
        $theme_map = ['orange'=>'starbucks','light'=>'starbucks','dark'=>'ocean','starbucks'=>'starbucks','ocean'=>'ocean'];
        $theme = $theme_map[$theme_raw] ?? 'starbucks';
        
        if (empty($full_name) || empty($email)) {
            echo json_encode(['success' => false, 'message' => 'Name and email are required']);
            return;
        }
        
        $db = getDB();
        
        $stmt = $db->prepare("UPDATE users SET full_name = ?, email = ?, currency = ?, theme_preference = ? WHERE user_id = ?");
        $stmt->execute([$full_name, $email, $currency, $theme, $user_id]);
        
        $_SESSION['full_name'] = $full_name;
        $_SESSION['currency'] = $currency;
        $_SESSION['theme'] = $theme;
        
        $_SESSION['email'] = $email;
        
        echo json_encode([
            'success' => true,
            'message' => 'Profile updated successfully',
            'user' => [
                'user_id' => $user_id,
                'username' => $_SESSION['username'],
                'full_name' => $full_name,
                'email' => $email,
                'currency' => $currency,
                'theme' => $theme,
                'profile_picture' => $_SESSION['profile_picture'] ?? null
            ]
        ]);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function uploadAvatar() {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Not authenticated']);
        return;
    }
    if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => false, 'message' => 'No file uploaded']);
        return;
    }
    $file = $_FILES['avatar'];
    $allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    if (!in_array($mime, $allowed)) {
        echo json_encode(['success' => false, 'message' => 'Only JPG, PNG, GIF, WEBP allowed']);
        return;
    }
    if ($file['size'] > 5 * 1024 * 1024) {
        echo json_encode(['success' => false, 'message' => 'File too large (max 5MB)']);
        return;
    }
    $uploadDir = __DIR__ . '/../Frontend/uploads/avatars/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
    // Delete old avatar
    $user_id = $_SESSION['user_id'];
    $db = getDB();
    $stmt = $db->prepare("SELECT profile_picture FROM users WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $old = $stmt->fetchColumn();
    if ($old && file_exists(__DIR__ . '/../Frontend/' . $old)) {
        @unlink(__DIR__ . '/../Frontend/' . $old);
    }
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'avatar_' . $user_id . '_' . time() . '.' . strtolower($ext);
    $dest = $uploadDir . $filename;
    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        echo json_encode(['success' => false, 'message' => 'Failed to save file']);
        return;
    }
    $relativePath = 'uploads/avatars/' . $filename;
    $stmt = $db->prepare("UPDATE users SET profile_picture = ? WHERE user_id = ?");
    $stmt->execute([$relativePath, $user_id]);
    $_SESSION['profile_picture'] = $relativePath;
    echo json_encode(['success' => true, 'path' => $relativePath, 'message' => 'Avatar updated!']);
}

function changePassword() {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Not authenticated']);
        return;
    }
    
    try {
        $user_id = $_SESSION['user_id'];
        $current_password = $_POST['current_password'] ?? '';
        $new_password = $_POST['new_password'] ?? '';
        
        if (strlen($new_password) < 6) {
            echo json_encode(['success' => false, 'message' => 'New password must be at least 6 characters']);
            return;
        }
        
        $db = getDB();
        
        $stmt = $db->prepare("SELECT password_hash FROM users WHERE user_id = ?");
        $stmt->execute([$user_id]);
        $user = $stmt->fetch();
        
        if (!password_verify($current_password, $user['password_hash'])) {
            echo json_encode(['success' => false, 'message' => 'Current password is incorrect']);
            return;
        }
        
        $new_hash = password_hash($new_password, PASSWORD_DEFAULT);
        
        $stmt = $db->prepare("UPDATE users SET password_hash = ? WHERE user_id = ?");
        $stmt->execute([$new_hash, $user_id]);
        
        echo json_encode(['success' => true, 'message' => 'Password changed successfully']);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}
?>
