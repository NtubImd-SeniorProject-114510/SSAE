# web_app/mongo.py
"""
這個模組負責處理 MongoDB 的對話紀錄：
- 建立新對話
- 新增訊息
- 查詢/更新/刪除對話
- 取得使用者的對話清單
"""

from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime
import os

# ===============================
# 1. MongoDB 初始化連線
# ===============================

MONGO_URI = os.getenv("MONGO_URI")  # 從環境變數讀取 MongoDB 連線字串
client = MongoClient(MONGO_URI)     # 建立連線
db = client["chatbot_db"]           # 使用的資料庫名稱
col = db["conversations"]           # 對話集合 (Collection)


# ===============================
# 2. 對話相關操作
# ===============================

def create_conversation(user_id, title="新對話"):
    """
    建立一個新的對話紀錄
    - user_id: 使用者 ID
    - title: 對話標題 (預設為 "新對話")
    回傳新對話的 ObjectId (字串)
    """
    doc = {
        "user_id": user_id,
        "title": title,
        "messages": [],  # 對話訊息存放區
        "created_at": datetime.utcnow()  # UTC 時間，方便排序
    }
    result = col.insert_one(doc)
    return str(result.inserted_id)


def add_message(conversation_id, question, answer, sources=None):
    """
    向指定對話新增一則訊息
    - conversation_id: 對話 ID
    - question: 使用者的問題
    - answer: 系統回覆的答案
    - sources: 可選，答案的來源文件 (list)
    """
    message_data = {
        "question": question,
        "answer": answer,
        "timestamp": datetime.utcnow(),
    }
    if sources:
        message_data["sources"] = sources  # 加入引用來源

    col.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$push": {"messages": message_data}}
    )


def get_messages(conversation_id):
    """
    取得指定對話的所有訊息，並依時間排序 (由舊到新)
    - conversation_id: 對話 ID
    回傳訊息 list
    """
    doc = col.find_one({"_id": ObjectId(conversation_id)})
    if not doc:
        return []
    return sorted(doc["messages"], key=lambda m: m["timestamp"])


def update_conversation_title(conversation_id, new_title):
    """
    更新對話標題
    - conversation_id: 對話 ID
    - new_title: 新的標題
    """
    col.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$set": {"title": new_title}}
    )


def delete_conversation(conversation_id):
    """
    刪除指定對話
    - conversation_id: 對話 ID
    """
    col.delete_one({"_id": ObjectId(conversation_id)})


def get_conversation_by_id(conversation_id):
    """
    取得單一對話完整資訊（常用於權限檢查）
    - conversation_id: 對話 ID
    回傳 dict (找不到則 None)
    """
    return col.find_one({"_id": ObjectId(conversation_id)})


def get_conversations(user_id):
    """
    取得某個使用者的所有對話列表 (只回傳 id 與 title)
    - user_id: 使用者 ID
    若是訪客 (guest)，不回傳任何歷史紀錄
    """
    if user_id == "guest":
        return []

    docs = col.find({"user_id": user_id}).sort("created_at", -1)  # 依建立時間倒序
    return [
        {"id": str(d["_id"]), "title": d["title"]}
        for d in docs
    ]
