INSERT INTO applications (
  id,
  origin,
  name,
  email,
  phone,
  amount_cents,
  status,
  status_updated_at,
  created_at
) VALUES (
  'TEST-2026-001',
  'Site Web',
  'Jean Tremblay',
  'jean.tremblay@example.com',
  '+15141234567',
  500000,
  'IBV_COMPLETED',
  NOW(),
  NOW()
);

INSERT INTO client_notes (
  application_id,
  message,
  created_at
) VALUES (
  'TEST-2026-001',
  'Votre demande a été reçue et est en cours de traitement. Nous vous contacterons sous peu.',
  NOW()
);

SELECT * FROM applications WHERE id = 'TEST-2026-001';
SELECT * FROM client_notes WHERE application_id = 'TEST-2026-001';
