# web_app/utils/content_filter.py
# -*- coding: utf-8 -*-
from __future__ import annotations
import re, unicodedata
from typing import List, Dict, Any

# 你現有的清單（已擴充）
BANNED_WORDS = [
    "暴力","血腥","殺人","砍人", "打人", "分屍","斷頭","割喉","打架","謀殺","虐待","折磨","爆頭","肢解","虐殺","施暴","自虐",
    "炸彈","炸學校","暴徒","暴走","自殺","自殘","跳樓","割腕","放火","斬首","凌遲","槍擊","槍戰","血流成河","濺血",
    "色情","做愛","A片","性行為","性愛","性慾","性高潮","性器官","自慰","打手槍","口交","乳交","肛交","裸照","裸體","露點",
    "情色","色圖","巨乳","爆乳","陰道","陰莖","陰毛","小穴","陰唇","射精","潮吹","中出","內射","外射","調教","捆綁","綑綁","偷窺",
    "情趣用品","A片網站","色情網站","A片女優","AV女優","成人影片","成人網站","H片","露出","床戰","呻吟","浪叫","舔陰","舔奶",
    "色情影片","強暴","強姦","性侵","猥褻","迷姦","偷拍","非禮","灌醉","灌酒","性騷擾","強奸","性勒索","誘姦","性犯罪","下藥","迷藥",
    "戀童","兒童色情","戀童癖","戀童症","虐童","獸交","獸淫","虐狗","虐貓",
    "幹你娘","操你媽","操你祖宗","他媽的","媽的","幹你老師","王八蛋","龜兒子","狗娘養的","雜種","廢物","垃圾","死全家","死光光","死掉算了",
    "混蛋","白癡","蠢貨","傻逼","賤人","婊子","臭婊","小三","妓女","雞巴","屌","雞掰","肏","幹爆","靠北","靠腰","媽逼","王八羔子","畜生",
    "porn","hentai","anal","oral","cum","blowjob","handjob","fuck","motherfucker","fucking","shit","bullshit",
    "bitch","slut","whore","cunt","pussy","dick","cock","boobs","tits","asshole","bastard","jerkoff","suckmydick",
    "eatmyass","deepthroat","boner","buttfuck","rape","rapist","molest","incest","bukkake","bdsm","snuff","gore",
    "murder","killer","stab","stabbing","shoot","gun","bloody","blood","torture","abuse","violence","violent",
    "suicide","selfharm","hang","cutwrist","knife","bomb","explosion","terrorist","terror","massacre"
]

# 文字標準化（擋變形：F.u.c.k、S3X、性 行 為）
LEET_MAP = str.maketrans({"0":"o","1":"i","3":"e","4":"a","5":"s","7":"t","$":"s","@":"a"})
def normalize_text(text: str) -> str:
    if not text: return ""
    text = unicodedata.normalize("NFKC", text).lower()
    text = text.translate(LEET_MAP)
    return re.sub(r"[\s\W_]+", "", text)

# 編譯允許插入符號的 regex（做模糊匹配）
def _make_fuzzy_pattern(word: str) -> re.Pattern:
    esc = [re.escape(ch) for ch in word]
    pattern = r"[\s\W_]*".join(esc)  # 字與字之間可穿插符號/空白
    return re.compile(pattern, re.IGNORECASE)

_BANNED_PATTERNS = [_make_fuzzy_pattern(w) for w in BANNED_WORDS]
def contains_banned_content(text: str) -> bool:
    if not text: return False
    t = unicodedata.normalize("NFKC", text)
    return any(p.search(t) for p in _BANNED_PATTERNS) or any(w in normalize_text(text) for w in map(normalize_text, BANNED_WORDS))

def find_banned_words(text: str) -> list[str]:
    if not text: return []
    t = unicodedata.normalize("NFKC", text)
    hits = set()
    
    # 檢查模糊匹配
    for i, p in enumerate(_BANNED_PATTERNS):
        if p.search(t):
            hits.add(BANNED_WORDS[i])
    
    # 檢查標準化匹配
    normalized_text = normalize_text(text)
    for word in BANNED_WORDS:
        if normalize_text(word) in normalized_text:
            hits.add(word)
    
    return sorted(hits)

def debug_banned_content(text: str) -> dict:
    """調試函數：詳細顯示哪些詞被檢測到"""
    if not text:
        return {"has_banned": False, "found_words": [], "normalized_text": ""}
    
    t = unicodedata.normalize("NFKC", text)
    normalized_text = normalize_text(text)
    found_words = []
    
    # 檢查每個禁用詞
    for i, word in enumerate(BANNED_WORDS):
        # 模糊匹配檢查
        if _BANNED_PATTERNS[i].search(t):
            found_words.append(f"{word} (模糊匹配)")
        # 標準化匹配檢查
        elif normalize_text(word) in normalized_text:
            found_words.append(f"{word} (標準化匹配)")
    
    return {
        "has_banned": len(found_words) > 0,
        "found_words": found_words,
        "normalized_text": normalized_text,
        "original_text": text
    }