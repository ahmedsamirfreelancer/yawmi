<?php
// حساب مواعيد الصلاة (نسخة PHP مطابقة لـ prayer.js) — يرجّع ساعات عشرية لكل صلاة
declare(strict_types=1);

class PrayTimes {
  private static function dtr($d){ return $d * M_PI / 180; }
  private static function rtd($r){ return $r * 180 / M_PI; }
  private static function sin($d){ return sin(self::dtr($d)); }
  private static function cos($d){ return cos(self::dtr($d)); }
  private static function tan($d){ return tan(self::dtr($d)); }
  private static function arcsin($x){ return self::rtd(asin($x)); }
  private static function arccos($x){ return self::rtd(acos($x)); }
  private static function arctan2($y,$x){ return self::rtd(atan2($y,$x)); }
  private static function arccot($x){ return self::rtd(atan2(1,$x)); }
  private static function fix($a,$b){ $a = $a - $b * floor($a/$b); return $a < 0 ? $a + $b : $a; }
  private static function fixAngle($a){ return self::fix($a, 360); }
  private static function fixHour($a){ return self::fix($a, 24); }

  private static $METHODS = [
    'EGYPT'  => ['fajr'=>19.5, 'isha'=>17.5],
    'MWL'    => ['fajr'=>18,   'isha'=>17],
    'MAKKAH' => ['fajr'=>18.5, 'isha'=>'90'],
    'KARACHI'=> ['fajr'=>18,   'isha'=>18],
    'ISNA'   => ['fajr'=>15,   'isha'=>15],
  ];

  private static function julian($y,$m,$d){
    if ($m <= 2){ $y -= 1; $m += 12; }
    $A = floor($y/100); $B = 2 - $A + floor($A/4);
    return floor(365.25*($y+4716)) + floor(30.6001*($m+1)) + $d + $B - 1524.5;
  }
  private static function sunPos($jd){
    $D = $jd - 2451545.0;
    $g = self::fixAngle(357.529 + 0.98560028*$D);
    $q = self::fixAngle(280.459 + 0.98564736*$D);
    $L = self::fixAngle($q + 1.915*self::sin($g) + 0.020*self::sin(2*$g));
    $e = 23.439 - 0.00000036*$D;
    $decl = self::arcsin(self::sin($e)*self::sin($L));
    $RA = self::arctan2(self::cos($e)*self::sin($L), self::cos($L)) / 15; $RA = self::fixHour($RA);
    return ['decl'=>$decl, 'eqt'=>$q/15 - $RA];
  }

  // يرجّع مصفوفة المواعيد (ساعات) لتاريخ + موقع + توقيت
  public static function times(int $y, int $mo, int $d, float $lat, float $lng, float $tz, string $methodKey, int $asrFactor, array $offsets): array {
    $jd = self::julian($y,$mo,$d) - $lng/(15*24);
    $M = self::$METHODS[$methodKey] ?? self::$METHODS['EGYPT'];
    $midDay = function($t) use ($jd){ $e = self::sunPos($jd+$t)['eqt']; return self::fixHour(12 - $e); };
    $angleTime = function($angle,$t,$dir) use ($jd,$lat,$midDay){
      $dd = self::sunPos($jd+$t)['decl']; $noon = $midDay($t);
      $x = (-self::sin($angle) - self::sin($dd)*self::sin($lat)) / (self::cos($dd)*self::cos($lat));
      if (abs($x) > 1) return NAN;
      $a = self::arccos($x)/15; return $noon + ($dir==='ccw' ? -$a : $a);
    };
    $asrT = function($t) use ($jd,$lat,$asrFactor,$angleTime){
      $dd = self::sunPos($jd+$t)['decl'];
      $angle = -self::arccot($asrFactor + self::tan(abs($lat-$dd)));
      return $angleTime($angle,$t,'cw');
    };
    $t = [
      'fajr'    => $angleTime($M['fajr'], 5/24, 'ccw'),
      'dhuhr'   => $midDay(12/24),
      'asr'     => $asrT(13/24),
      'maghrib' => $angleTime(0.833, 18/24, 'cw'),
      'isha'    => is_numeric($M['isha']) && !is_string($M['isha']) ? $angleTime($M['isha'], 18/24, 'cw') : null,
    ];
    $adj = function($h) use ($tz,$lng){ return self::fixHour($h + $tz - $lng/15); };
    foreach ($t as $k=>$v) if ($v !== null && !is_nan($v)) $t[$k] = $adj($v);
    if ($t['isha'] === null) $t['isha'] = self::fixHour($t['maghrib'] + intval($M['isha'])/60);
    $t['dhuhr'] = self::fixHour($t['dhuhr'] + 1/60);
    foreach (['fajr','dhuhr','asr','maghrib','isha'] as $k)
      if (!empty($offsets[$k])) $t[$k] = self::fixHour($t[$k] + ((int)$offsets[$k])/60);
    return $t;
  }
}
