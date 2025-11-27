# web_app/mongo.py
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime
import os

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["chatbot_db"]
col = db["conversations"]

def create_conversation(user_id, title="新對話"):
    doc = {
        "user_id": user_id,
        "title": title,
        "messages": [],
        "created_at": datetime.utcnow()
    }
    result = col.insert_one(doc)
    return str(result.inserted_id)

def add_message(conversation_id, question, answer, sources=None):
    message_data = {
        "question": question,
        "answer": answer,
        "timestamp": datetime.utcnow(),
    }
    if sources:
        message_data["sources"] = sources

    col.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$push": {"messages": message_data}}
    )

def get_messages(conversation_id):
    doc = col.find_one({"_id": ObjectId(conversation_id)})
    if not doc: return []
    # sort by timestamp in ascending
    return sorted(doc["messages"], key=lambda m: m["timestamp"])

def update_conversation_title(conversation_id, new_title):
    col.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$set": {"title": new_title}}
    )

def delete_conversation(conversation_id):
    col.delete_one({"_id": ObjectId(conversation_id)})

def get_conversation_by_id(conversation_id):
    """取得單一對話（用於權限檢查）"""
    return col.find_one({"_id": ObjectId(conversation_id)})

def get_conversations(user_id):
    # 如果是訪客，不顯示歷史對話
    if user_id == "guest":
        return []
    
    docs = col.find({"user_id": user_id}).sort("created_at", -1)
    return [
        {"id": str(d["_id"]), "title": d["title"]}
        for d in docs
    ]