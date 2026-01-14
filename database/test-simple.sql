-- Simple test to verify SQL execution works
CREATE TABLE IF NOT EXISTS test_titan_migration (
  id SERIAL PRIMARY KEY,
  test_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO test_titan_migration (test_name) VALUES ('Migration Test');

SELECT * FROM test_titan_migration;
