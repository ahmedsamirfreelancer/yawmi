-- سكيمة yawmi_db (للتركيب من الصفر — للموجود استخدم migrate.sql)
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) UNIQUE NOT NULL,
  pass_hash VARCHAR(255) NOT NULL,
  name VARCHAR(120) DEFAULT '',
  recovery_q VARCHAR(190) DEFAULT '',
  recovery_a_hash VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessions (
  token CHAR(64) PRIMARY KEY,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL DEFAULT NULL,
  INDEX (user_id),
  INDEX idx_exp (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_template (
  user_id INT PRIMARY KEY,
  template_json MEDIUMTEXT NOT NULL,
  settings_json MEDIUMTEXT NOT NULL,
  level_seed VARCHAR(20) DEFAULT 'beginner',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS day_entries (
  user_id INT NOT NULL,
  day DATE NOT NULL,
  values_json MEDIUMTEXT NOT NULL,
  completion DECIMAL(5,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- بومودورو
CREATE TABLE IF NOT EXISTS pomodoro_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  day DATE NOT NULL,
  task_id VARCHAR(120) DEFAULT '',
  minutes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (user_id, day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- القرآن: حالة الحصون الخمسة (موضع/معدّل/تقدّم) — JSON مرن
CREATE TABLE IF NOT EXISTS quran_hifz (
  user_id INT PRIMARY KEY,
  data_json MEDIUMTEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- القرآن: تصنيفات رسوخ + حالة الضبط — JSON مرن
CREATE TABLE IF NOT EXISTS quran_review (
  user_id INT PRIMARY KEY,
  data_json MEDIUMTEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- اشتراكات Web Push (تنبيهات الخلفية)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  tz_offset INT DEFAULT 0,            -- دقائق فرق التوقيت = -getTimezoneOffset()
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_endpoint (endpoint(191)),
  INDEX (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- منع تكرار نفس التنبيه في نفس اليوم
CREATE TABLE IF NOT EXISTS push_log (
  user_id INT NOT NULL,
  day DATE NOT NULL,
  tag VARCHAR(40) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, day, tag)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- حد المحاولات (rate limiting) لتسجيل الدخول/الحساب
CREATE TABLE IF NOT EXISTS throttle (
  k VARCHAR(190) PRIMARY KEY,
  cnt INT DEFAULT 0,
  reset_at TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- توكنات استرجاع الباسوورد (بالإيميل لو متاح)
CREATE TABLE IF NOT EXISTS password_resets (
  token CHAR(64) PRIMARY KEY,
  user_id INT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  INDEX (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
