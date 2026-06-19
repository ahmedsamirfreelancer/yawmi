<?php
// راوتر الـAPI — yawmi
require __DIR__ . '/db.php';

$r = $_GET['r'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

try {
  switch ($r) {

    // ===== تسجيل حساب جديد =====
    case 'register': {
      if (!throttleHit('reg:' . clientIp(), 15, 3600)) fail('محاولات كتير، استنى شوية', 429);
      $b = body();
      $email = trim(strtolower($b['email'] ?? ''));
      $pass = (string)($b['password'] ?? '');
      $name = mb_substr(trim((string)($b['name'] ?? '')), 0, 120);
      $tpl = $b['template'] ?? null;
      $settings = $b['settings'] ?? null;
      $level = (string)($b['level'] ?? 'beginner');
      $recQ = mb_substr(trim((string)($b['recovery_q'] ?? '')), 0, 190);
      $recA = trim((string)($b['recovery_a'] ?? ''));
      if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('إيميل غير صحيح');
      if (strlen($pass) < 6) fail('الباسوورد لازم ٦ حروف على الأقل');
      if (!in_array($level, ['beginner', 'intermediate', 'advanced'], true)) $level = 'beginner';
      if (!is_array($tpl) || !is_array($settings)) fail('بيانات ناقصة');

      $pdo = db();
      $st = $pdo->prepare('SELECT id FROM users WHERE email = ?');
      $st->execute([$email]);
      if ($st->fetch()) fail('الإيميل ده مسجّل قبل كده', 409);

      $recAHash = ($recQ !== '' && $recA !== '') ? password_hash(mb_strtolower($recA), PASSWORD_BCRYPT) : '';

      $pdo->beginTransaction();
      $st = $pdo->prepare('INSERT INTO users (email, pass_hash, name, recovery_q, recovery_a_hash) VALUES (?,?,?,?,?)');
      $st->execute([$email, password_hash($pass, PASSWORD_BCRYPT), $name, $recQ, $recAHash]);
      $uid = (int)$pdo->lastInsertId();
      $st = $pdo->prepare('INSERT INTO user_template (user_id, template_json, settings_json, level_seed) VALUES (?,?,?,?)');
      $st->execute([$uid, json_encode($tpl, JSON_UNESCAPED_UNICODE), json_encode($settings, JSON_UNESCAPED_UNICODE), $level]);
      $token = createSession($uid);
      $pdo->commit();

      out(['token' => $token, 'user' => ['id' => $uid, 'email' => $email, 'name' => $name],
           'template' => $tpl, 'settings' => $settings, 'level' => $level]);
    }

    // ===== تسجيل دخول =====
    case 'login': {
      $b = body();
      $email = trim(strtolower($b['email'] ?? ''));
      $pass = (string)($b['password'] ?? '');
      if (!throttleHit('login:' . clientIp(), 12, 900)) fail('محاولات كتير، استنى ربع ساعة', 429);
      if (!throttleHit('login:' . $email, 8, 900)) fail('محاولات كتير على الحساب ده، استنى شوية', 429);
      $st = db()->prepare('SELECT id, pass_hash, name FROM users WHERE email = ?');
      $st->execute([$email]);
      $u = $st->fetch();
      if (!$u || !password_verify($pass, $u['pass_hash'])) fail('الإيميل أو الباسوورد غلط', 401);
      $token = createSession((int)$u['id']);
      $t = db()->prepare('SELECT template_json, settings_json, level_seed FROM user_template WHERE user_id = ?');
      $t->execute([(int)$u['id']]);
      $row = $t->fetch() ?: ['template_json' => '{}', 'settings_json' => '{}', 'level_seed' => 'beginner'];
      out(['token' => $token, 'user' => ['id' => (int)$u['id'], 'email' => $email, 'name' => $u['name']],
           'template' => json_decode($row['template_json'], true),
           'settings' => json_decode($row['settings_json'], true),
           'level' => $row['level_seed']]);
    }

    // ===== نسيت الباسوورد: يرجّع سؤال الأمان =====
    case 'forgot': {
      if (!throttleHit('forgot:' . clientIp(), 10, 900)) fail('محاولات كتير، استنى شوية', 429);
      $b = body();
      $email = trim(strtolower($b['email'] ?? ''));
      $st = db()->prepare('SELECT recovery_q, recovery_a_hash FROM users WHERE email = ?');
      $st->execute([$email]);
      $u = $st->fetch();
      // ما نكشفش إن الإيميل موجود أو لأ
      if (!$u || $u['recovery_q'] === '' || $u['recovery_a_hash'] === '') {
        out(['question' => null, 'msg' => 'مفيش سؤال أمان متسجّل لهذا الحساب']);
      }
      out(['question' => $u['recovery_q']]);
    }

    // ===== إعادة تعيين الباسوورد بإجابة سؤال الأمان =====
    case 'reset': {
      if (!throttleHit('reset:' . clientIp(), 10, 900)) fail('محاولات كتير، استنى شوية', 429);
      $b = body();
      $email = trim(strtolower($b['email'] ?? ''));
      $answer = trim((string)($b['answer'] ?? ''));
      $newPass = (string)($b['password'] ?? '');
      if (strlen($newPass) < 6) fail('الباسوورد لازم ٦ حروف على الأقل');
      $st = db()->prepare('SELECT id, recovery_a_hash FROM users WHERE email = ?');
      $st->execute([$email]);
      $u = $st->fetch();
      if (!$u || $u['recovery_a_hash'] === '' || !password_verify(mb_strtolower($answer), $u['recovery_a_hash'])) {
        fail('الإجابة غير صحيحة', 401);
      }
      db()->prepare('UPDATE users SET pass_hash = ? WHERE id = ?')->execute([password_hash($newPass, PASSWORD_BCRYPT), (int)$u['id']]);
      // إلغاء كل الجلسات القديمة بعد تغيير الباسوورد (أمان)
      db()->prepare('DELETE FROM sessions WHERE user_id = ?')->execute([(int)$u['id']]);
      $token = createSession((int)$u['id']);
      $t = db()->prepare('SELECT template_json, settings_json, level_seed FROM user_template WHERE user_id = ?');
      $t->execute([(int)$u['id']]);
      $row = $t->fetch() ?: ['template_json' => '{}', 'settings_json' => '{}', 'level_seed' => 'beginner'];
      out(['token' => $token, 'user' => ['id' => (int)$u['id'], 'email' => $email, 'name' => ''],
           'template' => json_decode($row['template_json'], true),
           'settings' => json_decode($row['settings_json'], true),
           'level' => $row['level_seed']]);
    }

    // ===== ضبط/تغيير سؤال الأمان (لليوزر المسجّل) =====
    case 'set-recovery': {
      $uid = requireUser();
      $b = body();
      $recQ = mb_substr(trim((string)($b['recovery_q'] ?? '')), 0, 190);
      $recA = trim((string)($b['recovery_a'] ?? ''));
      if ($recQ === '' || $recA === '') fail('السؤال والإجابة مطلوبين');
      db()->prepare('UPDATE users SET recovery_q = ?, recovery_a_hash = ? WHERE id = ?')
          ->execute([$recQ, password_hash(mb_strtolower($recA), PASSWORD_BCRYPT), $uid]);
      out(['ok' => true]);
    }

    // ===== تغيير الباسوورد (لليوزر المسجّل) =====
    case 'change-password': {
      $uid = requireUser();
      $b = body();
      $old = (string)($b['old'] ?? '');
      $new = (string)($b['password'] ?? '');
      if (strlen($new) < 6) fail('الباسوورد الجديد لازم ٦ حروف على الأقل');
      $st = db()->prepare('SELECT pass_hash FROM users WHERE id = ?');
      $st->execute([$uid]);
      $u = $st->fetch();
      if (!$u || !password_verify($old, $u['pass_hash'])) fail('الباسوورد الحالي غلط', 401);
      db()->prepare('UPDATE users SET pass_hash = ? WHERE id = ?')->execute([password_hash($new, PASSWORD_BCRYPT), $uid]);
      out(['ok' => true]);
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
      $st = db()->prepare('SELECT u.email, u.name, u.recovery_q, t.template_json, t.settings_json, t.level_seed
                           FROM users u JOIN user_template t ON t.user_id = u.id WHERE u.id = ?');
      $st->execute([$uid]);
      $row = $st->fetch();
      if (!$row) fail('not found', 404);
      out(['user' => ['id' => $uid, 'email' => $row['email'], 'name' => $row['name'], 'hasRecovery' => $row['recovery_q'] !== ''],
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
        $completion = max(0, min(100, (float)($b['completion'] ?? 0)));
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

    // ===== التقدّم: إنجاز آخر 60 يوم =====
    case 'progress': {
      $uid = requireUser();
      $st = db()->prepare('SELECT day, completion FROM day_entries WHERE user_id = ? AND day >= (CURDATE() - INTERVAL 60 DAY) ORDER BY day');
      $st->execute([$uid]);
      $days = [];
      foreach ($st->fetchAll() as $row) $days[$row['day']] = (float)$row['completion'];
      out(['days' => $days]);
    }

    // ===== القرآن: حالة الحصون الخمسة =====
    case 'hifz': {
      $uid = requireUser();
      if ($method === 'GET') {
        $st = db()->prepare('SELECT data_json FROM quran_hifz WHERE user_id = ?');
        $st->execute([$uid]);
        $row = $st->fetch();
        out(['data' => $row ? json_decode($row['data_json'], true) : null]);
      } else {
        $b = body();
        $data = is_array($b['data'] ?? null) ? $b['data'] : [];
        $st = db()->prepare('INSERT INTO quran_hifz (user_id, data_json) VALUES (?,?)
                             ON DUPLICATE KEY UPDATE data_json = VALUES(data_json)');
        $st->execute([$uid, json_encode($data, JSON_UNESCAPED_UNICODE)]);
        out(['ok' => true]);
      }
    }

    // ===== القرآن: تصنيفات رسوخ =====
    case 'review': {
      $uid = requireUser();
      if ($method === 'GET') {
        $st = db()->prepare('SELECT data_json FROM quran_review WHERE user_id = ?');
        $st->execute([$uid]);
        $row = $st->fetch();
        out(['data' => $row ? json_decode($row['data_json'], true) : null]);
      } else {
        $b = body();
        $data = is_array($b['data'] ?? null) ? $b['data'] : [];
        $st = db()->prepare('INSERT INTO quran_review (user_id, data_json) VALUES (?,?)
                             ON DUPLICATE KEY UPDATE data_json = VALUES(data_json)');
        $st->execute([$uid, json_encode($data, JSON_UNESCAPED_UNICODE)]);
        out(['ok' => true]);
      }
    }

    // ===== بومودورو: تسجيل جلسة + إجمالي اليوم =====
    case 'pomodoro': {
      $uid = requireUser();
      if ($method === 'GET') {
        $st = db()->prepare('SELECT task_id, COUNT(*) cnt, COALESCE(SUM(minutes),0) minutes FROM pomodoro_sessions WHERE user_id = ? AND day = CURDATE() GROUP BY task_id');
        $st->execute([$uid]);
        $rows = $st->fetchAll();
        $total = 0; $cnt = 0; $byTask = [];
        foreach ($rows as $r) { $total += (int)$r['minutes']; $cnt += (int)$r['cnt']; $byTask[] = ['task' => $r['task_id'], 'cnt' => (int)$r['cnt'], 'minutes' => (int)$r['minutes']]; }
        out(['total' => $total, 'cnt' => $cnt, 'byTask' => $byTask]);
      } else {
        $b = body();
        $task = mb_substr(trim((string)($b['task'] ?? '')), 0, 120);
        $minutes = max(0, min(600, (int)($b['minutes'] ?? 0)));
        if ($minutes <= 0) fail('minutes required');
        db()->prepare('INSERT INTO pomodoro_sessions (user_id, day, task_id, minutes) VALUES (?, CURDATE(), ?, ?)')
            ->execute([$uid, $task, $minutes]);
        out(['ok' => true]);
      }
    }

    // ===== Web Push: المفتاح العام =====
    case 'vapid': {
      global $cfg;
      out(['publicKey' => $cfg['vapid_public'] ?? null]);
    }

    // ===== Web Push: تسجيل اشتراك =====
    case 'push': {
      $uid = requireUser();
      $b = body();
      $endpoint = (string)($b['endpoint'] ?? '');
      $keys = $b['keys'] ?? [];
      $p256dh = (string)($keys['p256dh'] ?? '');
      $auth = (string)($keys['auth'] ?? '');
      $tz = (int)($b['tzOffset'] ?? 0);
      if ($endpoint === '' || $p256dh === '' || $auth === '') fail('بيانات الاشتراك ناقصة');
      db()->prepare('INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, tz_offset) VALUES (?,?,?,?,?)
                     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), p256dh = VALUES(p256dh), auth = VALUES(auth), tz_offset = VALUES(tz_offset)')
          ->execute([$uid, $endpoint, $p256dh, $auth, $tz]);
      out(['ok' => true]);
    }

    default:
      fail('unknown route', 404);
  }
} catch (Throwable $e) {
  error_log('yawmi api: ' . $e->getMessage());
  fail('server error', 500);
}
