<?php
// Suppress PHP notices/warnings so they don't break JSON output
error_reporting(0);
ini_set('display_errors', 0);
/**
 * CashFlow Currency Conversion Handler
 */

session_start();
require_once '../Database/config.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'get_rates':
        getRates();
        break;
    case 'convert':
        convert();
        break;
    case 'update_rates':
        updateRates();
        break;
    case 'get_supported_currencies':
        getSupportedCurrencies();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function getRates() {
    try {
        $db = getDB();
        
        $stmt = $db->query("SELECT * FROM exchange_rates ORDER BY from_currency, to_currency");
        $rates = $stmt->fetchAll();
        
        echo json_encode(['success' => true, 'rates' => $rates]);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function convert() {
    try {
        $amount = floatval($_GET['amount'] ?? 0);
        $from   = strtoupper(trim($_GET['from'] ?? 'USD'));
        $to     = strtoupper(trim($_GET['to']   ?? 'USD'));

        if ($from === $to) {
            echo json_encode(['success'=>true,'converted_amount'=>round($amount,4),'rate'=>1.0,'from'=>$from,'to'=>$to]);
            return;
        }

        $db = getDB();

        // Helper: get direct rate between two currencies
        $getRate = function($f, $t) use ($db) {
            $s = $db->prepare("SELECT rate FROM exchange_rates WHERE from_currency=? AND to_currency=?");
            $s->execute([$f,$t]);
            $row = $s->fetch();
            if ($row) return floatval($row['rate']);
            // Try inverse
            $s->execute([$t,$f]);
            $row = $s->fetch();
            if ($row) return 1.0 / floatval($row['rate']);
            return null;
        };

        // 1. Try direct rate
        $rate = $getRate($from, $to);
        if ($rate !== null) {
            echo json_encode([
                'success'          => true,
                'converted_amount' => round($amount * $rate, 4),
                'rate'             => round($rate, 6),
                'from'             => $from,
                'to'               => $to
            ]);
            return;
        }

        // 2. Bridge via USD: FROM -> USD -> TO
        $toUsd   = $getRate($from, 'USD');
        $fromUsd = $getRate('USD', $to);
        if ($toUsd !== null && $fromUsd !== null) {
            $bridgeRate = $toUsd * $fromUsd;
            echo json_encode([
                'success'          => true,
                'converted_amount' => round($amount * $bridgeRate, 4),
                'rate'             => round($bridgeRate, 6),
                'from'             => $from,
                'to'               => $to,
                'note'             => 'via USD'
            ]);
            return;
        }

        // 3. Bridge via EUR
        $toEur   = $getRate($from, 'EUR');
        $fromEur = $getRate('EUR', $to);
        if ($toEur !== null && $fromEur !== null) {
            $bridgeRate = $toEur * $fromEur;
            echo json_encode([
                'success'          => true,
                'converted_amount' => round($amount * $bridgeRate, 4),
                'rate'             => round($bridgeRate, 6),
                'from'             => $from,
                'to'               => $to,
                'note'             => 'via EUR'
            ]);
            return;
        }

        echo json_encode(['success'=>false,'message'=>"No exchange rate found for $from to $to"]);

    } catch (PDOException $e) {
        echo json_encode(['success'=>false,'message'=>'Database error: '.$e->getMessage()]);
    }
}

function updateRates() {
    // This function would typically call an external API to get current rates
    // For demo purposes, we'll just update the timestamp
    try {
        $db = getDB();
        
        $stmt = $db->query("UPDATE exchange_rates SET last_updated = NOW()");
        
        echo json_encode(['success' => true, 'message' => 'Exchange rates updated']);
        
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    }
}

function getSupportedCurrencies() {
    $currencies = [
        'USD' => ['name' => 'US Dollar', 'symbol' => '$'],
        'EUR' => ['name' => 'Euro', 'symbol' => '€'],
        'GBP' => ['name' => 'British Pound', 'symbol' => '£'],
        'JPY' => ['name' => 'Japanese Yen', 'symbol' => '¥'],
        'PHP' => ['name' => 'Philippine Peso', 'symbol' => '₱'],
        'CNY' => ['name' => 'Chinese Yuan', 'symbol' => '¥'],
        'INR' => ['name' => 'Indian Rupee', 'symbol' => '₹'],
        'AUD' => ['name' => 'Australian Dollar', 'symbol' => 'A$'],
        'CAD' => ['name' => 'Canadian Dollar', 'symbol' => 'C$'],
        'CHF' => ['name' => 'Swiss Franc', 'symbol' => 'Fr'],
    ];
    
    echo json_encode(['success' => true, 'currencies' => $currencies]);
}
?>
