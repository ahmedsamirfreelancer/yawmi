<?php
// انسخه لـ config.php على السيرفر واملأ القيم (config.php مش بيترفع git)
return [
  'host' => 'localhost',
  'db'   => 'yawmi_db',
  'user' => 'yawmi_usr',
  'pass' => 'CHANGE_ME',

  // مفاتيح Web Push — ولّدها بـ: php api/gen-vapid.php والصق الناتج هنا
  // 'vapid_public'  => '...',
  // 'vapid_subject' => 'mailto:admin@yawmi.digitalawy.com',
  // 'vapid_private_pem' => '...',
];
