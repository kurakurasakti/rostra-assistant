-- One WhatsApp number may only be linked to one account.
-- A second account scanning the same phone would receive that phone's
-- full chat history in its inbox (cross-tenant data leak).
CREATE UNIQUE INDEX IF NOT EXISTS profiles_wa_connected_number_unique
ON public.profiles (wa_connected_number)
WHERE wa_connected_number IS NOT NULL;
