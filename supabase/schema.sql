-- =============================================================
-- Rostra — Supabase Schema
-- Jalankan secara berurutan di Supabase SQL Editor
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- 5.1  Enum types
-- ─────────────────────────────────────────────────────────────

CREATE TYPE order_status          AS ENUM ('aktif', 'selesai', 'dibatalkan');
CREATE TYPE message_status        AS ENUM ('menunggu', 'terkirim', 'gagal', 'dibatalkan');
CREATE TYPE inbox_direction       AS ENUM ('masuk', 'keluar');
CREATE TYPE inbox_status          AS ENUM ('baru', 'dibalas', 'diabaikan', 'dieskalasi');
CREATE TYPE message_classification AS ENUM ('rutin', 'sensitif', 'tidak_diketahui');
CREATE TYPE template_type         AS ENUM (
  'konfirmasi_pesanan',
  'pengingat_pembayaran',
  'pengingat_janji_temu',
  'custom'
);


-- ─────────────────────────────────────────────────────────────
-- Helper: updated_at auto-update trigger
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────
-- 5.2  profiles table + RLS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE profiles (
  id                   UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name        TEXT        NOT NULL DEFAULT '',
  brand_voice          TEXT        NOT NULL DEFAULT 'Ramah, profesional, dan informatif',
  fonnte_device_id     TEXT,
  fonnte_device_token  TEXT,
  wa_connected         BOOLEAN     NOT NULL DEFAULT FALSE,
  onboarding_complete  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ─────────────────────────────────────────────────────────────
-- 5.3  Auto-create profile trigger (fires on auth.users insert)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, business_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'business_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─────────────────────────────────────────────────────────────
-- 5.4  message_templates table + RLS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE message_templates (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       template_type NOT NULL,
  name       TEXT          NOT NULL,
  body       TEXT          NOT NULL,
  is_default BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own templates"
  ON message_templates
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX message_templates_user_id_idx ON message_templates(user_id);


-- ─────────────────────────────────────────────────────────────
-- 5.5  Auto-seed default templates (fires on profiles insert)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.seed_default_templates()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.message_templates (user_id, type, name, body, is_default)
  VALUES
    (
      NEW.id,
      'konfirmasi_pesanan',
      'Konfirmasi Pesanan',
      $t1$Halo {{client_name}}, terima kasih sudah memesan dari {{business_name}}! 🎉

Pesanan kamu: {{order_description}}
Total: {{total_price}}

Kami akan segera menghubungi kamu untuk detail selanjutnya. Terima kasih!$t1$,
      TRUE
    ),
    (
      NEW.id,
      'pengingat_pembayaran',
      'Pengingat Pembayaran',
      $t2$Halo {{client_name}} 👋

Mengingatkan bahwa {{stage_name}} sebesar {{amount}} untuk pesanan "{{order_description}}" jatuh tempo pada {{due_date}}.

Mohon segera melakukan pembayaran. Terima kasih!

— {{business_name}}$t2$,
      TRUE
    ),
    (
      NEW.id,
      'pengingat_janji_temu',
      'Pengingat Janji Temu',
      $t3$Halo {{client_name}} 😊

Mengingatkan jadwal {{appointment_title}} kamu bersama {{business_name}} pada:
📅 {{scheduled_date}}
📍 {{location}}

Sampai jumpa!$t3$,
      TRUE
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_templates();


-- ─────────────────────────────────────────────────────────────
-- 5.6  clients table + RLS + indexes
-- ─────────────────────────────────────────────────────────────

CREATE TABLE clients (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  whatsapp_number  TEXT        NOT NULL,
  email            TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own clients"
  ON clients
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX clients_user_id_idx        ON clients(user_id);
CREATE INDEX clients_wa_number_idx      ON clients(whatsapp_number);

CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ─────────────────────────────────────────────────────────────
-- 5.7  orders table + RLS + indexes
-- ─────────────────────────────────────────────────────────────

CREATE TABLE orders (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id    UUID         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  description  TEXT         NOT NULL,
  total_price  NUMERIC(15,2) NOT NULL DEFAULT 0,
  status       order_status NOT NULL DEFAULT 'aktif',
  notes        TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own orders"
  ON orders
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX orders_user_id_idx   ON orders(user_id);
CREATE INDEX orders_client_id_idx ON orders(client_id);
CREATE INDEX orders_status_idx    ON orders(status);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ─────────────────────────────────────────────────────────────
-- 5.8  payment_stages table + RLS + indexes
-- ─────────────────────────────────────────────────────────────

CREATE TABLE payment_stages (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 TEXT        NOT NULL,
  amount               NUMERIC(15,2) NOT NULL DEFAULT 0,
  due_date             DATE        NOT NULL,
  paid                 BOOLEAN     NOT NULL DEFAULT FALSE,
  paid_at              TIMESTAMPTZ,
  reminder_days_before INT         NOT NULL DEFAULT 3,
  sort_order           INT         NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payment_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own payment stages"
  ON payment_stages
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX payment_stages_order_id_idx ON payment_stages(order_id);
CREATE INDEX payment_stages_user_id_idx  ON payment_stages(user_id);
CREATE INDEX payment_stages_due_date_idx ON payment_stages(due_date) WHERE paid = FALSE;


-- ─────────────────────────────────────────────────────────────
-- 5.9  appointments table + RLS + indexes
-- ─────────────────────────────────────────────────────────────

CREATE TABLE appointments (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id             UUID        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title                 TEXT        NOT NULL,
  scheduled_at          TIMESTAMPTZ NOT NULL,
  location              TEXT,
  reminder_hours_before INT         NOT NULL DEFAULT 24,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own appointments"
  ON appointments
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX appointments_order_id_idx    ON appointments(order_id);
CREATE INDEX appointments_user_id_idx     ON appointments(user_id);
CREATE INDEX appointments_scheduled_at_idx ON appointments(scheduled_at);


-- ─────────────────────────────────────────────────────────────
-- 5.10  scheduled_messages table + RLS + indexes
-- ─────────────────────────────────────────────────────────────

CREATE TABLE scheduled_messages (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id         UUID           NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  client_id        UUID           REFERENCES clients(id) ON DELETE SET NULL,
  payment_stage_id UUID           REFERENCES payment_stages(id) ON DELETE SET NULL,
  appointment_id   UUID           REFERENCES appointments(id) ON DELETE SET NULL,
  message_type     TEXT           NOT NULL,
  whatsapp_number  TEXT           NOT NULL,
  message_body     TEXT           NOT NULL,
  scheduled_at     TIMESTAMPTZ    NOT NULL,
  sent_at          TIMESTAMPTZ,
  status           message_status NOT NULL DEFAULT 'menunggu',
  error_message    TEXT,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own scheduled messages"
  ON scheduled_messages
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX scheduled_messages_user_id_idx ON scheduled_messages(user_id);
CREATE INDEX scheduled_messages_pending_idx
  ON scheduled_messages(scheduled_at)
  WHERE status = 'menunggu';


-- ─────────────────────────────────────────────────────────────
-- 5.11  inbox_messages table + RLS + indexes
-- ─────────────────────────────────────────────────────────────

CREATE TABLE inbox_messages (
  id               UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID                   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id        UUID                   REFERENCES clients(id) ON DELETE SET NULL,
  direction        inbox_direction        NOT NULL DEFAULT 'masuk',
  whatsapp_number  TEXT                   NOT NULL,
  sender_name      TEXT,
  message_body     TEXT                   NOT NULL,
  classification   message_classification NOT NULL DEFAULT 'tidak_diketahui',
  ai_draft_reply   TEXT,
  status           inbox_status           NOT NULL DEFAULT 'baru',
  replied_at       TIMESTAMPTZ,
  wa_message_id    TEXT,
  received_at      TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  CONSTRAINT inbox_messages_user_wa_message_id_key UNIQUE (user_id, wa_message_id)
);

ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own inbox messages"
  ON inbox_messages
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX inbox_messages_user_id_idx      ON inbox_messages(user_id);
CREATE INDEX inbox_messages_wa_number_idx    ON inbox_messages(whatsapp_number);
CREATE INDEX inbox_messages_status_idx       ON inbox_messages(status);
CREATE INDEX inbox_messages_received_at_idx  ON inbox_messages(received_at DESC);
