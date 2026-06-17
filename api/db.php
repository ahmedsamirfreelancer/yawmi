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

// يرجّع user_id من التوكن أو يوقف بـ401
function requireUser(): int {
  $t = bearer();
  if (!$t) fail('unauthorized', 401);
  $st = db()->prepare('SELECT user_id FROM sessions WHERE token = ?');
  $st->execute([$t]);
  $row = $st->fetch();
  if (!$row) fail('unauthorized', 401);
  return (int)$row['user_id'];
}

function newToken(): string { return bin2hex(random_bytes(32)); }
