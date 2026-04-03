-- SmartZap - Inicialização Mínima de Schema
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO public.settings (key, value) VALUES
  ('app_initialized', '{"status": "true"}'),
  ('whatsapp_configured', '{"status": "false"}')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
