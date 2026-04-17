-- Contact form inbox. Consumed by admin_list_messages/admin_mark_message_read/admin_delete_message RPCs.
-- No Express migration existed for this table — the old Express app created it implicitly.
-- Defined here so the admin RPC functions have a concrete schema to rely on.

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  subject    VARCHAR(200) NOT NULL,
  message    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_is_read     ON public.contact_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at  ON public.contact_messages(created_at DESC);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- No direct policies granted: contact submissions flow in via a public Edge Function
-- (using the service role) and reads happen exclusively through the admin RPCs
-- declared later with SECURITY DEFINER.
