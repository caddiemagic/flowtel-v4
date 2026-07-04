-- Release 0.6.8 — Concierge note attribution
alter table if exists flowtel_stays
  add column if not exists witness_note_by text;
