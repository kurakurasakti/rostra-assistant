-- send_queue: holds AI auto-replies pending delivery under Level 2 semi-auto mode
create table if not exists send_queue (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  message_id  uuid references inbox_messages(id) on delete set null,
  to_number   text not null,
  message     text not null,
  send_at     timestamptz not null,
  cancelled   boolean not null default false,
  sent        boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table send_queue enable row level security;

create policy "Users manage own queue"
  on send_queue for all using (auth.uid() = user_id);

create index idx_send_queue_pending on send_queue(send_at)
  where cancelled = false and sent = false;
