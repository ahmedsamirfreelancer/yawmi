<?php
// راوتر الـAPI — yawmi
require __DIR__ . '/db.php';

$r = $_GET['r'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

try {
  switch ($r) {

    // ===== تسجيل حساب جديد =====
    case 'register': {
      $b = body();
      $email = trim(strtolower($b['email'] ?? ''));
      $pass = (string)($b['password'] ?? '');
      $name = trim((string)($b['name'] ?? ''));
      $tpl = $b['template'] ?? null;
      $settings = $b['settings'] ?? null;
      $level = (string)($b['level'] ?? 'beginner');
      if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('إيميل غير صحيح');
      if (strlen($pass) < 6) fail('الباسوورد لازم ٦ حروف على الأقل');
      if (!is_array($tpl) || !is_array($settings)) fail('بيانات ناقصة');

      $pdo = db();
      $st = $pdo->prepare('SELECT id FROM users WHERE email = ?');
      $st->execute([$email]);
      if ($st->fetch()) fail('الإيميل ده مسجّل قبل كده', 409);

      $pdo->beginTransaction();
      $st = $pdo->prepare('INSERT INTO users (email, pass_hash, name) VALUES (?,?,?)');
      $st->execute([$email, password_hash($pass, PASSWORD_BCRYPT), $name]);
      $uid = (int)$pdo->lastInsertId();
      $st = $pdo->prepare('INSERT INTO user_template (user_id, template_json, settings_json, level_seed) VALUES (?,?,?,?)');
      $st->execute([$uid, json_encode($tpl, JSON_UNESCAPED_UNICODE), json_encode($settings, JSON_UNESCAPED_UNICODE), $level]);
      $token = newToken();
      $pdo->prepare('INSERT INTO sessions (token, user_id) VALUES (?,?)')->execute([$token, $uid]);
      $pdo->commit();

      out(['token' => $token, 'user' => ['id' => $uid, 'email' => $email, 'name' => $name],
           'template' => $tpl, 'settings' => $settings, 'level' => $level]);
    }

    // ===== تسجيل دخول =====
    case 'login': {
      $b = body();
      $email = trim(strtolower($b['email'] ?? ''));
      $pass = (string)($b['password'] ?? '');
      $st = db()->prepare('SELECT id, pass_hash, name FROM users WHERE email = ?');
      $st->execute([$email]);
      $u = $st->fetch();
      if (!$u || !password_verify($pass, $u['pass_hash'])) fail('الإيميل أو الباسوورد غلط', 401);
      $token = newToken();
      db()->prepare('INSERT INTO sessions (token, user_id) VALUES (?,?)')->execute([$token, (int)$u['id']]);
      $t = db()->prepare('SELECT template_json, settings_json, level_seed FROM user_template WHERE user_id = ?');
      $t->execute([(int)$u['id']]);
      $row = $t->fetch() ?: ['template_json' => '{}', 'settings_json' => '{}', 'level_seed' => 'beginner'];
      out(['token' => $token, 'user' => ['id' => (int)$u['id'], 'email' => $email, 'name' => $u['name']],
           'template' => json_decode($row['template_json'], true),
           'settings' => json_decode($row['settings_json'], true),
           'level' => $row['level_seed']]);
    }

    // ===== تسجيل خروج (يلغي التوكن من السيرفر) =====
    case 'logout': {
      $t = bearer();
      if ($t) db()->prepare('DELETE FROM sessions WHERE token = ?')->execute([$t]);
      out(['ok' => true]);
    }

    // ===== تحميل بيانات اليوزر =====
    case 'bootstrap': {
      $uid = requireUser();
      $st = db()->prepare('SELECT u.email, u.name, t.template_json, t.settings_json, t.level_seed
                           FROM users u JOIN user_template t ON t.user_id = u.id WHERE u.id = ?');
      $st->execute([$uid]);
      $row = $st->fetch();
      if (!$row) fail('not found', 404);
      out(['user' => ['id' => $uid, 'email' => $row['email'], 'name' => $row['name']],
           'template' => json_decode($row['template_json'], true),
           'settings' => json_decode($row['settings_json'], true),
           'level' => $row['level_seed']]);
    }

    // ===== حفظ القالب (بعد التعديل) =====
    case 'template': {
      $uid = requireUser();
      $b = body();
      if (!isset($b['template']) || !is_array($b['template'])) fail('template required');
      $st = db()->prepare('UPDATE user_template SET template_json = ? WHERE user_id = ?');
      $st->execute([json_encode($b['template'], JSON_UNESCAPED_UNICODE), $uid]);
      out(['ok' => true]);
    }

    // ===== حفظ الإعدادات =====
    case 'settings': {
      $uid = requireUser();
      $b = body();
      if (!isset($b['settings']) || !is_array($b['settings'])) fail('settings required');
      $st = db()->prepare('UPDATE user_template SET settings_json = ? WHERE user_id = ?');
      $st->execute([json_encode($b['settings'], JSON_UNESCAPED_UNICODE), $uid]);
      out(['ok' => true]);
    }

    // ===== يوم: قراءة/حفظ =====
    case 'day': {
      $uid = requireUser();
      if ($method === 'GET') {
        $day = $_GET['date'] ?? '';
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $day)) fail('bad date');
        $st = db()->prepare('SELECT values_json FROM day_entries WHERE user_id = ? AND day = ?');
        $st->execute([$uid, $day]);
        $row = $st->fetch();
        out(['values' => $row ? json_decode($row['values_json'], true) : new stdClass()]);
      } else {
        $b = body();
        $day = $b['date'] ?? '';
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $day)) fail('bad date');
        $values = is_array($b['values'] ?? null) ? $b['values'] : [];
        $completion = (float)($b['completion'] ?? 0);
        if (count($values) === 0) {
          db()->prepare('DELETE FROM day_entries WHERE user_id = ? AND day = ?')->execute([$uid, $day]);
        } else {
          $st = db()->prepare('INSERT INTO day_entries (user_id, day, values_json, completion) VALUES (?,?,?,?)
                               ON DUPLICATE KEY UPDATE values_json = VALUES(values_json), completion = VALUES(completion)');
          $st->execute([$uid, $day, json_encode($values, JSON_UNESCAPED_UNICODE), $completion]);
        }
        out(['ok' => true]);
      }
    }

    // ===== التقدّم: سلسلة + إنجاز آخر 60 يوم + متوسط 30 =====
    case 'progress': {
      $uid = requireUser();
      $st = db()->prepare('SELECT day, completion FROM day_entries WHERE user_id = ? AND day >= (CURDATE() - INTERVAL 60 DAY) ORDER BY day');
      $st->execute([$uid]);
      $days = [];
      foreach ($st->fetchAll() as $row) $days[$row['day']] = (float)$row['completion'];
      out(['days' => $days]);
    }

    default:
      fail('unknown route', 404);
  }
} catch (Throwable $e) {
  fail('server error', 500);
}
