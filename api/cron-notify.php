<?php
// كرون التنبيهات: يشتغل كل دقيقة (CLI). يرسل أذان الصلاة + التذكيرات في وقتها لكل مشترك.
// التشغيل: * * * * * /usr/local/lsws/lsphp83/bin/php /home/yawmi.digitalawy.com/public_html/api/cron-notify.php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('cli only'); }

require __DIR__ . '/db.php';
require __DIR__ . '/praytimes.php';
require __DIR__ . '/webpush.php';
global $cfg;
if (empty($cfg['vapid_private_pem']) || empty($cfg['vapid_public'])) { fwrite(STDERR, "no vapid keys\n"); exit(1); }

$pdo = db();
// كل المشتركين مع إعداداتهم
$rows = $pdo->query("SELECT s.id, s.user_id, s.endpoint, s.p256dh, s.auth, s.tz_offset, t.settings_json
                     FROM push_subscriptions s JOIN user_template t ON t.user_id = s.user_id")->fetchAll();

$nowUtc = time();
$sent = 0; $dead = [];

foreach ($rows as $row) {
  $settings = json_decode($row['settings_json'], true) ?: [];
  $p = $settings['prayer'] ?? [];
  $adhan = $settings['adhan'] ?? [];
  $rem = $settings['reminders'] ?? [];
  $tz = (int)$row['tz_offset']; // دقائق

  // وقت المستخدم المحلي الحالي
  $local = $nowUtc + $tz * 60;
  $lh = (int)gmdate('G', $local);
  $lm = (int)gmdate('i', $local);
  $curMin = $lh * 60 + $lm;
  $today = gmdate('Y-m-d', $local);

  $due = []; // [tag => [title, body]]

  // أذان الصلوات
  if (!empty($adhan['enabled']) && isset($p['lat'], $p['lng']) && $p['lat'] !== null) {
    $y = (int)gmdate('Y', $local); $mo = (int)gmdate('n', $local); $d = (int)gmdate('j', $local);
    $asrFactor = (($p['asr'] ?? 'Standard') === 'Hanafi') ? 2 : 1;
    $times = PrayTimes::times($y,$mo,$d, (float)$p['lat'], (float)$p['lng'], $tz/60.0,
                              $p['method'] ?? 'EGYPT', $asrFactor, $p['offsets'] ?? []);
    $labels = ['fajr'=>'الفجر','dhuhr'=>'الظهر','asr'=>'العصر','maghrib'=>'المغرب','isha'=>'العشاء'];
    foreach ($labels as $k=>$lbl) {
      if (!isset($times[$k]) || is_nan($times[$k])) continue;
      $pm = (int)round($times[$k] * 60);
      if ($pm === $curMin) $due['adhan_'.$k] = ['حان وقت ' . $lbl, 'حيّ على الصلاة 🤍'];
    }
  }

  // التذكيرات (HH:MM)
  $remLabels = ['sabah'=>'أذكار الصباح','masa'=>'أذكار المساء','wird'=>'وِرد القرآن','sleep'=>'وقت النوم وأذكاره'];
  foreach ($remLabels as $k=>$lbl) {
    $val = trim((string)($rem[$k] ?? ''));
    if (!preg_match('/^(\d{1,2}):(\d{2})$/', $val, $m)) continue;
    $rmin = ((int)$m[1]) * 60 + (int)$m[2];
    if ($rmin === $curMin) $due['rem_'.$k] = ['⏰ ' . $lbl, 'افتكر وردك النهاردة'];
  }

  if (!$due) continue;

  foreach ($due as $tag => $msg) {
    // منع التكرار في نفس اليوم
    try {
      $ins = $pdo->prepare('INSERT INTO push_log (user_id, day, tag) VALUES (?,?,?)');
      $ins->execute([$row['user_id'], $today, $tag]);
    } catch (Throwable $e) { continue; } // اتبعت قبل كده النهاردة

    try {
      $code = wp_send(
        ['endpoint'=>$row['endpoint'], 'p256dh'=>$row['p256dh'], 'auth'=>$row['auth']],
        ['title'=>$msg[0], 'body'=>$msg[1], 'tag'=>$tag],
        $cfg
      );
      if ($code === 404 || $code === 410) $dead[] = $row['id'];
      else if ($code >= 200 && $code < 300) $sent++;
    } catch (Throwable $e) { fwrite(STDERR, $e->getMessage()."\n"); }
  }
}

// حذف الاشتراكات الميتة
if ($dead) {
  $in = implode(',', array_fill(0, count($dead), '?'));
  $pdo->prepare("DELETE FROM push_subscriptions WHERE id IN ($in)")->execute($dead);
}
// تنظيف سجل التنبيهات الأقدم من ٣ أيام
$pdo->exec("DELETE FROM push_log WHERE day < (CURDATE() - INTERVAL 3 DAY)");

fwrite(STDOUT, "sent=$sent dead=" . count($dead) . "\n");
