-- 프로필 테이블 생성
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade,
    role text check (role in ('admin', 'user')) default 'user',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (id)
);

-- 모델 테이블 생성
create table if not exists public.models (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    category text not null,
    price integer not null,
    file_path text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 프로젝트 테이블 생성
create table if not exists public.projects (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    objects jsonb not null,
    total_price integer not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS 활성화
alter table public.profiles enable row level security;
alter table public.models enable row level security;
alter table public.projects enable row level security;

-- 프로필 정책
create policy "프로필은 본인만 조회 가능"
    on public.profiles for select
    using (auth.uid() = id);

create policy "관리자는 모든 프로필 조회 가능"
    on public.profiles for select
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );

-- 모델 정책
create policy "모든 사용자가 모델 조회 가능"
    on public.models for select
    using (true);

create policy "관리자만 모델 추가 가능"
    on public.models for insert
    with check (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );

create policy "관리자만 모델 수정 가능"
    on public.models for update
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );

create policy "관리자만 모델 삭제 가능"
    on public.models for delete
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );

-- 프로젝트 정책
create policy "모든 사용자가 프로젝트 조회 가능"
    on public.projects for select
    using (true);

create policy "인증된 사용자만 프로젝트 추가 가능"
    on public.projects for insert
    with check (auth.uid() is not null);

create policy "본인의 프로젝트만 수정 가능"
    on public.projects for update
    using (auth.uid() = id);

create policy "본인의 프로젝트만 삭제 가능"
    on public.projects for delete
    using (auth.uid() = id);

-- 트리거 함수 생성
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, role)
    values (new.id, 'user');
    return new;
end;
$$ language plpgsql security definer;

-- 새 사용자 생성 시 프로필 자동 생성
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- 특정 사용자를 관리자로 설정
UPDATE public.profiles
SET role = 'admin'
WHERE id = '사용자의_UUID';  -- 초대된 사용자의 UUID로 교체 