<?php
// يولّد مفاتيح VAPID (مرة واحدة على السيرفر) ويطبع سطور تتحط في config.php
// التشغيل: php api/gen-vapid.php
declare(strict_types=1);
$res = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
if (!$res) { fwrite(STDERR, "openssl EC غير متاح\n"); exit(1); }
openssl_pkey_export($res, $pem);
$d = openssl_pkey_get_details($res);
$pub = "\x04" . str_pad($d['ec']['x'], 32, "\x00", STR_PAD_LEFT) . str_pad($d['ec']['y'], 32, "\x00", STR_PAD_LEFT);
$pubB64u = rtrim(strtr(base64_encode($pub), '+/', '-_'), '=');

echo "// ===== انسخ السطور دي جوه مصفوفة config.php =====\n";
echo "  'vapid_public'  => '" . $pubB64u . "',\n";
echo "  'vapid_subject' => 'mailto:admin@yawmi.digitalawy.com',\n";
echo "  'vapid_private_pem' => <<<'PEM'\n" . trim($pem) . "\nPEM,\n";
