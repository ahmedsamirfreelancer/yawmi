<?php
// Web Push (VAPID + aes128gcm) بـ PHP خالص — RFC 8291 / RFC 8188 / RFC 8292
// يعتمد على openssl (EC P-256) + hash_hkdf. لا يحتاج composer.
declare(strict_types=1);

function b64u_encode(string $d): string { return rtrim(strtr(base64_encode($d), '+/', '-_'), '='); }
function b64u_decode(string $d): string { return base64_decode(strtr($d, '-_', '+/') . str_repeat('=', (4 - strlen($d) % 4) % 4)); }

// تحويل نقطة عامة خام (65 بايت 0x04||X||Y) إلى مفتاح PEM لـ openssl
function wp_raw_public_to_pem(string $raw): string {
  $der = hex2bin('3059301306072a8648ce3d020106082a8648ce3d030107034200') . $raw;
  return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
}

// توقيع ES256: يحوّل توقيع openssl DER إلى صيغة JOSE (r||s) 64 بايت
function wp_der_to_jose(string $der): string {
  $off = 0;
  if (ord($der[$off++]) !== 0x30) return '';
  if (ord($der[$off]) & 0x80) { $off += (ord($der[$off]) & 0x7f) + 1; } else { $off++; }
  $parse = function () use ($der, &$off) {
    $off++; // 0x02
    $len = ord($der[$off++]);
    $v = substr($der, $off, $len); $off += $len;
    $v = ltrim($v, "\x00");
    return str_pad($v, 32, "\x00", STR_PAD_LEFT);
  };
  $r = $parse(); $s = $parse();
  return $r . $s;
}

// يولّد توكن VAPID JWT للـ audience (أصل الـ endpoint)
function wp_vapid_jwt(string $audience, array $cfg): string {
  $header = b64u_encode(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
  $payload = b64u_encode(json_encode([
    'aud' => $audience,
    'exp' => time() + 12 * 3600,
    'sub' => $cfg['vapid_subject'] ?? 'mailto:admin@yawmi.digitalawy.com',
  ], JSON_UNESCAPED_SLASHES));
  $signingInput = $header . '.' . $payload;
  $pkey = openssl_pkey_get_private($cfg['vapid_private_pem']);
  if (!$pkey) throw new RuntimeException('vapid private key invalid');
  $der = '';
  openssl_sign($signingInput, $der, $pkey, OPENSSL_ALGO_SHA256);
  $jose = wp_der_to_jose($der);
  return $signingInput . '.' . b64u_encode($jose);
}

// يشفّر الحمولة لاشتراك معيّن ويرجّع [body, headers]
function wp_encrypt(string $payload, string $ua_public_raw, string $auth_secret): array {
  // مفتاح مؤقّت للسيرفر
  $as = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
  if (!$as) throw new RuntimeException('cannot create EC key');
  $d = openssl_pkey_get_details($as);
  $as_public = "\x04" . str_pad($d['ec']['x'], 32, "\x00", STR_PAD_LEFT) . str_pad($d['ec']['y'], 32, "\x00", STR_PAD_LEFT);

  // ECDH shared secret
  $uaPem = wp_raw_public_to_pem($ua_public_raw);
  $uaKey = openssl_pkey_get_public($uaPem);
  $secret = openssl_pkey_derive($uaKey, $as, 32);
  if ($secret === false) throw new RuntimeException('ecdh derive failed');

  $salt = random_bytes(16);
  // IKM (RFC 8291)
  $keyInfo = "WebPush: info\x00" . $ua_public_raw . $as_public;
  $ikm = hash_hkdf('sha256', $secret, 32, $keyInfo, $auth_secret);
  // CEK + NONCE (RFC 8188)
  $cek = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\x00", $salt);
  $nonce = hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\x00", $salt);

  // record: plaintext || 0x02 (آخر سجل، بدون padding إضافي)
  $plain = $payload . "\x02";
  $tag = '';
  $cipher = openssl_encrypt($plain, 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag, '', 16);
  if ($cipher === false) throw new RuntimeException('aes encrypt failed');

  $rs = 4096;
  $body = $salt . pack('N', $rs) . chr(65) . $as_public . $cipher . $tag;
  return [$body];
}

// يرسل تنبيه واحد. يرجّع كود HTTP (201/200 = نجاح، 404/410 = اشتراك ميت)
function wp_send(array $sub, array $payloadArr, array $cfg): int {
  $endpoint = $sub['endpoint'];
  $ua_public = b64u_decode($sub['p256dh']);
  $auth = b64u_decode($sub['auth']);
  $payload = json_encode($payloadArr, JSON_UNESCAPED_UNICODE);

  [$body] = wp_encrypt($payload, $ua_public, $auth);
  $parts = parse_url($endpoint);
  $audience = $parts['scheme'] . '://' . $parts['host'] . (isset($parts['port']) ? ':' . $parts['port'] : '');
  $jwt = wp_vapid_jwt($audience, $cfg);

  $headers = [
    'TTL: ' . (12 * 3600),
    'Content-Encoding: aes128gcm',
    'Content-Type: application/octet-stream',
    'Urgency: normal',
    'Authorization: vapid t=' . $jwt . ',k=' . $cfg['vapid_public'],
  ];
  $ch = curl_init($endpoint);
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $body,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15,
  ]);
  curl_exec($ch);
  $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  return $code;
}
