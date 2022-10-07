```
docker exec clickhouse bash /sql/all.sh

docker exec -it clickhouse clickhouse-client
```

Try a query (listen history for a user):

```sql
select
  u.handle,
  t.route_id,
  t.track_id,
  p.created_at as played_at
from
  plays p
  join tracks t on p.play_item_id = t.track_id
  join users u on p.user_id = u.user_id
where
  u.handle = 'stereosteve'
order by p.created_at desc
;
```