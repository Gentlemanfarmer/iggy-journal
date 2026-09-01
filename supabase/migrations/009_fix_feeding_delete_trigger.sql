-- Fix: AFTER DELETE trigger tried to INSERT into feeding_plan_history
-- after CASCADE had already deleted the component, causing FK violation.
-- Solution: skip DELETE logging (cascade removes history rows anyway).

create or replace function public.log_feeding_component_change()
returns trigger as $$
begin
  if tg_op = 'UPDATE' then
    insert into public.feeding_plan_history (user_id, component_id, action, old_quantity_g, new_quantity_g, old_quantity_available_g, new_quantity_available_g)
    values (new.user_id, new.id, 'UPDATE', old.quantity_g, new.quantity_g, old.quantity_available_g, new.quantity_available_g);
  elsif tg_op = 'INSERT' then
    insert into public.feeding_plan_history (user_id, component_id, action, new_quantity_g, new_quantity_available_g)
    values (new.user_id, new.id, 'INSERT', new.quantity_g, new.quantity_available_g);
  end if;
  return null;
end;
$$ language plpgsql security definer;
