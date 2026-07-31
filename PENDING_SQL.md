# 本人が戻ったら実行してほしいSQL

Supabase SQL Editor（https://supabase.com/dashboard/project/jrcqoxjcvwxkfjwuywlk/sql/new）で実行してください。
実行済みのものはこのファイルから消してpushしてOKです。

## 1. 食事写真の保存用（実行したか未確認、念のため再掲）

```sql
insert into storage.buckets (id, name, public)
values ('meal-photos', 'meal-photos', true)
on conflict (id) do nothing;

create policy "allow anon upload meal photos"
on storage.objects for insert to anon
with check (bucket_id = 'meal-photos');

create policy "allow public read meal photos"
on storage.objects for select to public
using (bucket_id = 'meal-photos');

alter table meals add column if not exists photo_url text;
```

## 2. 食事記録の削除機能を有効にする（未実行）

削除ボタンを追加したが、mealsテーブルはRLSが強めなのでこれが無いと削除が失敗する。

```sql
create policy "allow anon delete meals"
on meals for delete to anon
using (true);
```
