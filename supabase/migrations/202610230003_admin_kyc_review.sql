create or replace function public.admin_update_kyc_status(
 p_kyc_id uuid,
 p_status text,
 p_admin_notes text,
 p_admin_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare current_row public.kyc_records%rowtype; updated_row public.kyc_records%rowtype;
begin
 if p_status not in ('UNDER_REVIEW','APPROVED','REJECTED') then
  raise exception 'Invalid KYC status';
 end if;
 if not exists(select 1 from public.admin_users where user_id=p_admin_user_id and is_active=true) then
  raise exception 'Active administrator required';
 end if;
 select * into current_row from public.kyc_records where id=p_kyc_id for update;
 if not found then raise exception 'KYC record not found'; end if;
 if current_row.status not in ('PENDING','UNDER_REVIEW') then
  raise exception 'Only pending KYC records can be reviewed';
 end if;
 update public.kyc_records
 set status=p_status,
     admin_notes=nullif(left(coalesce(p_admin_notes,''),1000),''),
     updated_at=now()
 where id=p_kyc_id returning * into updated_row;
 insert into public.admin_audit_logs(admin_user_id,action,record_type,record_id,details)
 values(p_admin_user_id,'KYC_STATUS_CHANGED','kyc_record',p_kyc_id,
 jsonb_build_object('from',current_row.status,'to',p_status));
 return jsonb_build_object('id',updated_row.id,'status',updated_row.status,'updated_at',updated_row.updated_at);
end;
$$;
revoke all on function public.admin_update_kyc_status(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_update_kyc_status(uuid,text,text,uuid) to service_role;
