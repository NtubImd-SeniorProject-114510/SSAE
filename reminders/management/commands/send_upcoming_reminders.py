from django.core.management.base import BaseCommand
from django.conf import settings
from django.apps import apps
from django.utils import timezone
from django.db.models import Q
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.contrib.contenttypes.models import ContentType
from datetime import timedelta, datetime, time
from reminders.models import ReminderLog

def _display_name(user):
    """確保顯示姓在前、名在後"""
    if not user:
        return "(未知使用者)"
    last = getattr(user, "last_name", "") or ""
    first = getattr(user, "first_name", "") or ""
    name = (last + first).strip()
    if name:
        return name
    # 若沒填就退回 username 或 email
    return getattr(user, "username", None) or getattr(user, "email", "(未命名)")


D7, D1 = "D7", "D1"


# ---------------- 基本工具 ----------------
def _local(dt):
    """
    把任何輸入轉成「本地時區 datetime」。
    支援 datetime.date（會補上 00:00）。
    """
    tz = timezone.get_current_timezone()
    if isinstance(dt, datetime):
        if timezone.is_aware(dt):
            return timezone.localtime(dt)
        return timezone.make_aware(dt, tz)
    elif hasattr(dt, "year") and hasattr(dt, "month") and hasattr(dt, "day"):
        # 是 date（沒有時間）
        return timezone.make_aware(datetime.combine(dt, time(0, 0)), tz)
    return dt


def _local_today():
    return timezone.localtime(timezone.now()).date()

def _day_range(target_date):
    tz = timezone.get_current_timezone()
    start_naive = datetime.combine(target_date, time(0, 0, 0))
    end_naive = datetime.combine(target_date, time(23, 59, 59, 999000))
    start = timezone.make_aware(start_naive, tz)
    end = timezone.make_aware(end_naive, tz)
    return start, end

def _get_attr(obj, dotted):
    """
    支援 a__b__c 的跨關聯屬性讀取。
    若 dotted 為 None/空字串/非字串，直接回傳 None，避免 AttributeError。
    """
    if not dotted or not isinstance(dotted, str):
        return None

    cur = obj
    parts = dotted.split("__")
    last_idx = len(parts) - 1

    for idx, part in enumerate(parts):
        if cur is None:
            return None
        cur = getattr(cur, part, None)
        # 只在最後一段且是可呼叫時嘗試呼叫（例如 get_absolute_url）
        if callable(cur) and idx == last_idx:
            try:
                cur = cur()
            except TypeError:
                # 有些 method 需要參數，略過不呼叫
                pass
    return cur

def _pick_user(row, user_field_spec):
    """
    user_field 可以是字串或清單。清單時依序嘗試，優先回傳有 email 的使用者。
    """
    if isinstance(user_field_spec, (list, tuple)):
        for path in user_field_spec:
            u = _get_attr(row, path)
            if getattr(u, "email", None):
                return u
        for path in user_field_spec:
            u = _get_attr(row, path)
            if u:
                return u
        return None
    return _get_attr(row, user_field_spec)


# ---------------- 信件處理 ----------------
def _send_email(to_email, subject, text_body, html_body=None, dry_run=False):
    if dry_run:
        return
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
        to=[to_email],
    )
    if html_body:
        msg.attach_alternative(html_body, "text/html")
    msg.send(fail_silently=False)


# ---------------- Log ----------------
def _mark_sent(user, obj, rtype, dry_run=False):
    if dry_run:
        return
    ct = ContentType.objects.get_for_model(obj.__class__)
    ReminderLog.objects.get_or_create(
        user=user,
        content_type=ct,
        object_id=str(obj.pk),
        reminder_type=rtype,
    )

def _already_sent(user, obj, rtype):
    ct = ContentType.objects.get_for_model(obj.__class__)
    return ReminderLog.objects.filter(
        user=user, content_type=ct, object_id=str(obj.pk), reminder_type=rtype
    ).exists()


# ---------------- 模板渲染 ----------------
def _render(user, title, starts_at, rtype, kind_label, detail_url=None):
    when_str = _local(starts_at).strftime("%Y-%m-%d %H:%M")
    subject = f"提醒：{kind_label}「{title or '(未命名)'}」即將開始（{when_str}）"
    ctx = {
        "user": user,
        "display_name": _display_name(user), 
        "title": title or "(未命名)",
        "starts_at": when_str,
        "rtype": "7 天前提醒" if rtype == D7 else "前一天提醒",
        "detail_url": detail_url,
        "kind_label": kind_label,
    }
    text_body = render_to_string("emails/upcoming_reminder.txt", ctx)
    html_body = render_to_string("emails/upcoming_reminder.html", ctx)
    return subject, text_body, html_body


# ---------------- 取資料 ----------------
def _iter_source_items(source, target_start, target_end):
    model_label = source["model"]
    app_label, model_name = model_label.split(".")
    try:
        Model = apps.get_model(app_label, model_name)
    except LookupError:
        print(f"[WARN] 找不到模型：{model_label}")
        return

    qs = Model.objects.all()
    for k, v in (source.get("filters") or {}).items():
        try:
            qs = qs.filter(**{k: v})
        except Exception as e:
            print(f"[WARN] 過濾條件無效：{k}={v} on {model_label} -> {e}")
            return

    date_field_spec = source["date_field"]
    if isinstance(date_field_spec, str):
        try:
            qs = qs.filter(
                Q(**{f"{date_field_spec}__gte": target_start}) &
                Q(**{f"{date_field_spec}__lte": target_end})
            )
            print(f"[INFO] 使用日期欄位：{date_field_spec} on {model_label}")
        except Exception as e:
            print(f"[WARN] 日期欄位無效：{date_field_spec} on {model_label} -> {e}")
            return

    elif isinstance(date_field_spec, dict) and "date" in date_field_spec:
        date_key = date_field_spec["date"]
        try:
            day = timezone.localtime(target_start).date()
            qs = qs.filter(**{f"{date_key}": day})
            print(f"[INFO] 使用日期欄位：{date_key} (date-only) on {model_label}")
        except Exception as e:
            print(f"[WARN] 日期欄位無效：{date_key} on {model_label} -> {e}")
            return
    else:
        print(f"[WARN] 不支援的 date_field 型態：{date_field_spec} on {model_label}")
        return

    for obj in qs.select_related():
        yield obj

def _resolve_log_object(source, obj):
    """
    根據 REMINDER_SOURCES 裡的 object_field_for_log 取出真實要記錄的物件。
    若未設定（None / 空），就直接回傳自己。
    支援 a__b__c 跨關聯欄位。
    """
    key = source.get("object_field_for_log")
    if not key:
        return obj
    cur = obj
    for p in key.split("__"):
        if cur is None:
            return obj
        cur = getattr(cur, p, None)
    return cur or obj


# ---------------- 主程式 ----------------
class Command(BaseCommand):
    help = "寄出 D+7 / D+1 活動與行事曆提醒（管理命令 + cron/launchd）"

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="只顯示將寄出的清單，不實際寄信/寫 Log")
        parser.add_argument("--days", default="7,1", help="要掃描的天數，預設 7,1")
        parser.add_argument("--date", help="指定今天(本地)日期 yyyy-mm-dd，主要用於測試（不填則用現在）")
        parser.add_argument("--debug", action="store_true", help="顯示跳過原因")

    def handle(self, *args, **opts):
        dry = opts["dry_run"]
        debug = opts["debug"]
        days_list = [int(x.strip()) for x in opts["days"].split(",") if x.strip()]
        today = datetime.strptime(opts["date"], "%Y-%m-%d").date() if opts.get("date") else _local_today()

        total_sent = 0
        sources = getattr(settings, "REMINDER_SOURCES", [])
        if not sources:
            self.stdout.write(self.style.WARNING("REMINDER_SOURCES 未設定；請到 settings.py 填入來源設定"))
            return

        for d in days_list:
            target_date = today + timedelta(days=d)
            start_dt, end_dt = _day_range(target_date)
            rtype = D7 if d == 7 else (D1 if d == 1 else f"D{d}")

            for source in sources:
                label = source.get("label", "事件")
                date_field = source["date_field"]
                title_field = source["title_field"]
                user_field = source["user_field"]
                detail_url_attr = source.get("detail_url_attr")

                for row in _iter_source_items(source, start_dt, end_dt):
                    user = _pick_user(row, user_field)
                    if not user:
                        if debug: self.stdout.write(f"[SKIP] {label}: 無 user -> row={getattr(row,'pk',None)}")
                        continue
                    email = getattr(user, "email", None)
                    if not email:
                        if debug: self.stdout.write(f"[SKIP] {label}: user 無 email -> user_id={getattr(user,'pk',None)}")
                        continue

                    title = _get_attr(row, title_field)

                    starts_at = None
                    if isinstance(date_field, str):
                        starts_at = _get_attr(row, date_field)
                    elif isinstance(date_field, dict) and "date" in date_field:
                        dval = _get_attr(row, date_field["date"])
                        tkey = date_field.get("time")
                        tval = _get_attr(row, tkey) if tkey else None
                        if dval:
                            if not tval:
                                tval = time(0, 0, 0)
                            naive = datetime.combine(dval, tval)
                            starts_at = timezone.make_aware(naive, timezone.get_current_timezone())

                    if not starts_at:
                        if debug: self.stdout.write(f"[SKIP] {label}: 取不到 starts_at -> row={getattr(row,'pk',None)}")
                        continue

                    obj_for_log = _resolve_log_object(source, row)
                    if _already_sent(user, obj_for_log, rtype):
                        if debug: self.stdout.write(f"[SKIP] {label}: 已寄送過 -> {email} {title}")
                        continue

                    detail_url = None
                    if detail_url_attr:
                        val = getattr(obj_for_log, detail_url_attr, None)
                        detail_url = val() if callable(val) else val

                    subject, text_body, html_body = _render(user, title, starts_at, rtype, label, detail_url)
                    self.stdout.write(f"[{label}] {rtype} -> {email} | {title} | {_local(starts_at)}")

                    if not dry:
                        _send_email(email, subject, text_body, html_body, dry_run=False)
                        _mark_sent(user, obj_for_log, rtype, dry_run=False)
                        total_sent += 1

        msg = f"Reminders {'to send (dry-run)' if dry else 'sent'}: {total_sent}"
        self.stdout.write(self.style.SUCCESS(msg))