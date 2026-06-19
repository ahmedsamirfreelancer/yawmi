<?php
// اتصال قاعدة البيانات + أدوات مشتركة (PDO)
declare(strict_types=1);
date_default_timezone_set('UTC');
ini_set('display_errors', '0');   // متعرضش أخطاء PHP للمستخدم (أمان)
ini_set('log_errors', '1');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

$cfgFile = __DIR__ . '/config.php';
if (!file_exists($cfgFile)) { http_response_code(500); echo json_encode(['error' => 'config missing']); exit; }
$cfg = require $cfgFile;

function db(): PDO {
  static $pdo = null;
  global $cfg;
  if ($pdo === null) {
    $dsn = "mysql:host={$cfg['host']};dbname={$cfg['db']};charset=utf8mb4";
    $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES => false,
    ]);
  }
  return $pdo;
}

function out($data, int $code = 200): void { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }
function fail(string $msg, int $code = 400): void { out(['error' => $msg], $code); }

function body(): array {
  $raw = file_get_contents('php://input');
  if ($raw === '' || $raw === false) return [];
  $j = json_decode($raw, true);
  return is_array($j) ? $j : [];
}

function bearer(): ?string {
  $h = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
  if (!$h && function_exists('apache_request_headers')) {
    $hdrs = apache_request_headers();
    $h = $hdrs['Authorization'] ?? ($hdrs['authorization'] ?? '');
  }
  if (preg_match('/Bearer\s+([A-Za-z0-9]+)/', (string)$h, $m)) return $m[1];
  return null;
}

// يرجّع user_id من التوكن أو يوقف بـ401 (مع انتهاء صلاحية + تمديد منزلق)
function requireUser(): int {
  $t = bearer();
  if (!$t) fail('unauthorized', 401);
  $st = db()->prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?');
  $st->execute([$t]);
  $row = $st->fetch();
  if (!$row) fail('unauthorized', 401);
  // جلسة منتهية → تُحذف
  if ($row['expires_at'] !== null && strtotime($row['expires_at']) < time()) {
    db()->prepare('DELETE FROM sessions WHERE token = ?')->execute([$t]);
    fail('انتهت الجلسة، سجّل الدخول من جديد', 401);
  }
  // تمديد منزلق: كل استخدام يطوّل الصلاحية ٦٠ يوم (تحديث خفيف مرة كل مرة)
  db()->prepare('UPDATE sessions SET expires_at = (NOW() + INTERVAL 60 DAY) WHERE token = ?')->execute([$t]);
  return (int)$row['user_id'];
}

function newToken(): string { return bin2hex(random_bytes(32)); }

// ينشئ جلسة جديدة بصلاحية ٦٠ يوم + ينضّف الجلسات المنتهية بشكل خفيف
function createSession(int $uid): string {
  $token = newToken();
  db()->prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?, NOW() + INTERVAL 60 DAY)')->execute([$token, $uid]);
  // تنظيف عرضي (1%) للجلسات المنتهية حتى ما يكبرش الجدول
  if (random_int(1, 100) === 1) {
    db()->exec('DELETE FROM sessions WHERE expires_at IS NOT NULL AND expires_at < NOW()');
  }
  return $token;
}

function clientIp(): string {
  return (string)($_SERVER['HTTP_CF_CONNECTING_IP'] ?? ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'));
}

// حد المحاولات: يرجّع false لو تخطّى الحد خلال النافذة الزمنية
function throttleHit(string $key, int $max, int $windowSec): bool {
  $pdo = db();
  $pdo->prepare('INSERT INTO throttle (k, cnt, reset_at) VALUES (?, 1, (NOW() + INTERVAL ? SECOND))
                 ON DUPLICATE KEY UPDATE
                   cnt = IF(reset_at < NOW(), 1, cnt + 1),
                   reset_at = IF(reset_at < NOW(), (NOW() + INTERVAL ? SECOND), reset_at)')
      ->execute([$key, $windowSec, $windowSec]);
  $st = $pdo->prepare('SELECT cnt FROM throttle WHERE k = ?');
  $st->execute([$key]);
  $cnt = (int)($st->fetchColumn() ?: 0);
  return $cnt <= $max;
}
