from __future__ import annotations

import json
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.utils.dateparse import parse_date

from .models import Todo


def _json_error(message: str, status: int = 400) -> JsonResponse:
    return JsonResponse({"success": False, "message": message}, status=status)


def _parse_json(request):
    try:
        return json.loads((request.body or b"{}").decode("utf-8"))
    except Exception:
        return {}


@login_required
@require_http_methods(["GET"])
def get_todos(request):
    todos = Todo.objects.filter(user=request.user).order_by('date', 'created_at')
    data = [
        {
            'id': t.id,
            'title': t.title,
            'description': t.description or '',
            'date': t.date.isoformat(),
            'completed': t.completed,
            'created_at': t.created_at.isoformat(),
        }
        for t in todos
    ]
    return JsonResponse({'success': True, 'todos': data})


@csrf_exempt
@login_required
@require_http_methods(["POST"])
def create_todo(request):
    data = _parse_json(request)
    title = (data.get('title') or '').strip()
    description = (data.get('description') or '').strip()
    date_str = data.get('date')

    if not title:
        return _json_error('標題不能為空')
    if not date_str:
        return _json_error('日期無效')

    dt = parse_date(date_str)
    if not dt:
        return _json_error('日期格式錯誤')

    todo = Todo.objects.create(
        user=request.user,
        title=title,
        description=description,
        date=dt,
    )
    return JsonResponse({
        'success': True,
        'todo': {
            'id': todo.id,
            'title': todo.title,
            'description': todo.description or '',
            'date': todo.date.isoformat(),
            'completed': todo.completed,
            'created_at': todo.created_at.isoformat(),
        }
    }, status=201)


@csrf_exempt
@login_required
@require_http_methods(["PUT"])
def update_todo(request, todo_id: int):
    todo = get_object_or_404(Todo, id=todo_id, user=request.user)
    data = _parse_json(request)

    if 'title' in data:
        todo.title = (data.get('title') or '').strip()
    if 'description' in data:
        todo.description = (data.get('description') or '').strip()
    if 'date' in data:
        dt = parse_date(data.get('date'))
        if dt:
            todo.date = dt
    if 'completed' in data:
        todo.completed = bool(data.get('completed'))

    todo.save()
    return JsonResponse({
        'success': True,
        'todo': {
            'id': todo.id,
            'title': todo.title,
            'description': todo.description or '',
            'date': todo.date.isoformat(),
            'completed': todo.completed,
            'created_at': todo.created_at.isoformat(),
        }
    })


@csrf_exempt
@login_required
@require_http_methods(["DELETE"])
def delete_todo(request, todo_id: int):
    todo = get_object_or_404(Todo, id=todo_id, user=request.user)
    todo.delete()
    return JsonResponse({'success': True})
