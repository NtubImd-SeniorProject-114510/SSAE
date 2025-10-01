import os
import re
import json
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# LangChain 套件
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.vectorstores import Chroma
from langchain_openai import AzureOpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain.chat_models import AzureChatOpenAI
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain

# ===============================
# 1. 載入環境變數與 MongoDB 測試連線
# ===============================

# 載入 .env 檔
load_dotenv()

def test_mongo_connection():
    """測試 MongoDB 是否能成功連線"""
    MONGO_URI = os.getenv("MONGO_URI")
    if not MONGO_URI:
        print("❌ 找不到 MONGODB_URI 環境變數")
        return
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
        client.admin.command('ping')
        print("✅ MongoDB 連線成功。")
    except ConnectionFailure:
        print("❌ MongoDB 連線失敗")
    except Exception as e:
        print(f"❌ MongoDB 連線錯誤: {e}")

print("🚀 測試 MongoDB 連線...")
test_mongo_connection()


# ===============================
# 2. 初始化 LLM 與 Embedding 模型
# ===============================

# 初始化 LLM (Azure OpenAI)
llm = AzureChatOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
    temperature=0
)

# 初始化 Embedding 模型
embeddings = AzureOpenAIEmbeddings(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    azure_deployment=os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME")
)


# ===============================
# 3. 文件處理與向量資料庫
# ===============================

def load_pdf_documents():
    """載入 uploaded_files 資料夾下的 PDF 文件"""
    current_dir = os.path.dirname(__file__)
    parent_dir = os.path.dirname(current_dir)
    pdf_dir = os.path.join(parent_dir, "uploaded_files")
    all_docs = []

    if not os.path.exists(pdf_dir):
        print(f"⚠️ 找不到資料夾：{pdf_dir}")
        return []

    for filename in os.listdir(pdf_dir):
        if filename.endswith(".pdf"):
            full_path = os.path.join(pdf_dir, filename)
            print(f"📄 載入：{filename}")
            loader = PyPDFLoader(full_path)
            docs = loader.load()
            all_docs.extend(docs)

    return all_docs


def split_documents(documents):
    """將文件切成小段落以利向量化"""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,  # 每段最大長度
        chunk_overlap=100,  # 段落重疊字數
        add_start_index=True
    )
    return splitter.split_documents(documents)


def create_vector_store(splits):
    """建立向量資料庫 (Chroma)"""
    return Chroma.from_documents(documents=splits, embedding=embeddings)


# ===============================
# 4. 建立進階 RAG 鏈
# ===============================

def create_advanced_rag_chain(retriever):
    """建立進階 RAG 問答鏈"""
    system_prompt = (
        "You are a helpful assistant for answering questions about National Taipei University of Business (NTUB). "
        "Use the following retrieved context to answer the question. "
        "If you don't know the answer, just say you don't know, and do not make up anything. "
        "You must answer **only in Traditional Chinese**, never use Simplified Chinese. "
        "Your tone should be friendly and professional (like a knowledgeable NTUB student helper), "
        "but your information must be accurate and based on the context. "
        "Always clearly mention that the information is from NTUB regulations, by saying things like '根據國立臺北商業大學的校規顯示'. "
        "Use bold (** **) or headers (like # or ##) to highlight key points. "
        "When listing items, use numbering (1. 2. 3.) or bullet points (•). "
        "Organize your response with clear structure.\n\n{context}"
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])

    qa_chain = create_stuff_documents_chain(llm, prompt)
    return create_retrieval_chain(retriever, qa_chain)


print("🚀 初始化進階 RAG 系統...")
docs = load_pdf_documents()
splits = split_documents(docs)
vectorstore = create_vector_store(splits)
retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 2})
advanced_rag_chain = create_advanced_rag_chain(retriever)
print("✅ 進階 RAG 系統初始化完成。")


# ===============================
# Helper: 安全地呼叫 llm 並抽出文字
# ===============================
def _call_llm_and_extract_text(messages):
    """
    呼叫 llm 並嘗試以各種可能的回傳型態抽出純文字（兼容不同 LangChain 版本）
    messages: list of SystemMessage/HumanMessage
    回傳純文字 str
    """
    res = llm(messages)
    # 常見型態處理
    # 1) 直接有 .content
    if hasattr(res, "content"):
        return res.content
    # 2) 可能回傳 list 或類似結構
    try:
        # 如果是 list-like（例如 [AIMessage(...)]）
        if isinstance(res, (list, tuple)) and len(res) > 0:
            first = res[0]
            if hasattr(first, "content"):
                return first.content
            return str(first)
    except Exception:
        pass
    # 3) ChatResult / generations
    if hasattr(res, "generations"):
        gens = res.generations
        try:
            if isinstance(gens, list) and len(gens) > 0:
                first_gen = gens[0]
                if isinstance(first_gen, list) and len(first_gen) > 0 and hasattr(first_gen[0], "text"):
                    return first_gen[0].text
        except Exception:
            pass
    # fallback
    return str(res)


# ===============================
# 5. 新增：語意分類函式（由 LLM 判斷是否為校規相關）
# ===============================
def classify_school_question(question: str, top_k: int = 3) -> dict:
    """
    用 LLM 判斷 question 是否和校規/學校政策相關（**語意判斷**，非關鍵字）。
    回傳 dict: {"is_school_regulation": bool, "reason": str}
    我們會把 top_k 個檢索到的片段給 LLM 做判斷（若 retriever 可用）。
    """
    # 取出 top_k 片段（若 retriever 可用）
    try:
        top_docs = retriever.get_relevant_documents(question)[:top_k]
    except Exception:
        try:
            top_docs = vectorstore.similarity_search(question, k=top_k)
        except Exception:
            top_docs = []

    snippets = []
    for d in top_docs:
        # 避免過長，限制每段最大字數
        content = getattr(d, "page_content", "") or str(d)
        snippets.append(content[:1500])

    snippet_text = "\n\n---\n\n".join(snippets) if snippets else "(no retrieved snippets)"

    system = SystemMessage(content=(
        "你是一個語意判斷器。你的任務是判斷使用者的提問是否與「國立臺北商業大學（NTUB）的校規、學校政策、行政規定或官方流程」有關。"
        "請以語意理解（不要使用簡單的關鍵字比對）來判斷。"
        "如果問題涉及：畢業條件、修課規定、學分、選課衝堂、修退選流程、證照需求、學校考試/檢定、行政流程（例如請假、註冊、審核）、或明確需要引用校內官方文件的答覆，都視為「校規/學校政策相關」。"
        "請**只回傳一個 JSON**，格式如下："
        '{"is_school_regulation": true/false, "reason": "一句話解釋判斷依據（不要超過兩句）"}'
    ))

    human = HumanMessage(content=(
        f"使用者提問：{question}\n\n"
        f"檢索到的文件片段（若有）如下：\n{snippet_text}\n\n"
        "請基於以上內容與語意，回傳 JSON 判斷結果（strict JSON，不能有其他多餘文字）。"
    ))

    raw = _call_llm_and_extract_text([system, human])

    # 嘗試解析 JSON，或用簡單正則抓 true/false 與理由
    parsed = {"is_school_regulation": False, "reason": "未解析結果，預設為非校規相關"}
    try:
        # 嘗試找 JSON 子字串
        json_start = raw.find("{")
        json_str = raw[json_start:] if json_start != -1 else raw
        parsed_json = json.loads(json_str)
        parsed = {
            "is_school_regulation": bool(parsed_json.get("is_school_regulation", False)),
            "reason": parsed_json.get("reason", "") if isinstance(parsed_json.get("reason", ""), str) else ""
        }
    except Exception:
        # fallback: 用簡單文字判斷
        lower = raw.lower()
        if "true" in lower or "是" in raw:
            parsed["is_school_regulation"] = True
            parsed["reason"] = raw.strip().replace("\n", " ")[:200]
        else:
            parsed["is_school_regulation"] = False
            parsed["reason"] = raw.strip().replace("\n", " ")[:200]

    return parsed


# ===============================
# 6. 查詢函式（主流程：先分類，再決定走 RAG 還是直接用 LLM 回答）
# ===============================
def ask_question(question: str, conversation_history: list = None) -> dict:
    """
    查詢問題並回傳格式化的答案（dict）：
    - answer: HTML 字串
    - has_sources: bool
    - sources: list
    """
    try:
        # 🔥 加入歷史對話（只取最近 8 筆）
        if conversation_history:
            recent_history = conversation_history[-8:]
            history_context = "之前的對話內容：\n"
            for msg in recent_history:
                history_context += f"Q: {msg['question']}\nA: {msg['answer']}\n\n"
            full_question = f"{history_context}現在的新問題：{question}"
        else:
            full_question = question

        # 1) 先判斷是否為「校規 / 學校政策」相關（語意判斷）
        clf = classify_school_question(question)
        is_school_q = clf.get("is_school_regulation", False)

        if is_school_q:
            # 走原本的 RAG 流程（會引用來源）
            response = advanced_rag_chain.invoke({"input": full_question})
            raw_answer = response["answer"].strip()

            # 收集引用來源
            pdf_sources = []
            for doc in response.get("context", []):
                if hasattr(doc, 'metadata') and 'source' in doc.metadata:
                    pdf_name = os.path.basename(doc.metadata['source'])
                    if pdf_name not in pdf_sources:
                        pdf_sources.append(pdf_name)

            # 格式化答案（跟原本一樣）
            raw_answer = re.sub(r'\*\*([^*\n]+?)\*\*',
                                r'<strong style="color:#4A5B73; font-weight:700;">\1</strong>',
                                raw_answer)

            lines = raw_answer.split('\n')
            formatted_lines = []

            for line in lines:
                line = line.strip()
                if not line:
                    continue

                # 標題處理
                if line.startswith('###'):
                    title = line.replace('###', '').strip()
                    formatted_lines.append(f'<h3 style="color:#5B7296; margin:12px 0 6px 0;">{title}</h3>')
                elif line.startswith('##'):
                    title = line.replace('##', '').strip()
                    formatted_lines.append(f'<h2 style="color:#4A668A; margin:15px 0 8px 0;">{title}</h2>')
                elif line.startswith('#'):
                    title = line.replace('#', '').strip()
                    formatted_lines.append(f'<h1 style="color:#365073; margin:18px 0 10px 0;">{title}</h1>')

                # 編號列表
                elif re.match(r'^(\d+)\.\s*(.+)$', line):
                    num, content = re.match(r'^(\d+)\.\s*(.+)$', line).groups()
                    formatted_lines.append(
                        f'<div style="display:flex; margin:6px 0;">'
                        f'<span style="min-width:28px; font-weight:650; color:#6B5B8A;">{num}.</span>'
                        f'<span style="flex:1; line-height:1.5;">{content}</span>'
                        f'</div>'
                    )

                # 點列清單
                elif line.startswith('- ') or line.startswith('• '):
                    content = line[2:].strip()
                    formatted_lines.append(f'<div style="margin:4px 0 4px 20px;">• {content}</div>')

                # 普通段落
                else:
                    formatted_lines.append(f'<p style="margin:6px 0; line-height:1.6; color:#334455;">{line}</p>')

            result_html = ''.join(formatted_lines)

            return {
                "answer": result_html,
                "has_sources": len(pdf_sources) > 0,
                "sources": pdf_sources,
                "classification": clf  # optional: 回傳分類依據給前端/除錯用
            }

        else:
            # 非校規相關：**不要顯示來源**，直接用 LLM 回答（不強制 RAG 的校規系統提示）
            system_non_rag = SystemMessage(content=(
                "你是一個友善的助理。請**只用繁體中文**回答，語氣親切、簡潔。"
                "此類問題為一般生活/閒聊/建議類型（非學校行政/校規），請不要引用或顯示任何檔案來源或說「根據XXX」，也不要製造看起來像官方來源的文字。"
                "若使用者問到學校行政/校規類問題，你應該先用分類器判斷再使用 RAG，但在這個模式下請**不要**提及來源。"
            ))

            human_non_rag = HumanMessage(content=full_question)
            raw_answer = _call_llm_and_extract_text([system_non_rag, human_non_rag]).strip()

            # 同樣做簡單的 markdown -> HTML 格式化（保留原來的格式化規則）
            raw_answer = re.sub(r'\*\*([^*\n]+?)\*\*',
                                r'<strong style="color:#4A5B73; font-weight:700;">\1</strong>',
                                raw_answer)

            lines = raw_answer.split('\n')
            formatted_lines = []

            for line in lines:
                line = line.strip()
                if not line:
                    continue

                # 標題處理（比較少用，但保留）
                if line.startswith('###'):
                    title = line.replace('###', '').strip()
                    formatted_lines.append(f'<h3 style="color:#5B7296; margin:12px 0 6px 0;">{title}</h3>')
                elif line.startswith('##'):
                    title = line.replace('##', '').strip()
                    formatted_lines.append(f'<h2 style="color:#4A668A; margin:15px 0 8px 0;">{title}</h2>')
                elif line.startswith('#'):
                    title = line.replace('#', '').strip()
                    formatted_lines.append(f'<h1 style="color:#365073; margin:18px 0 10px 0;">{title}</h1>')

                # 編號列表
                elif re.match(r'^(\d+)\.\s*(.+)$', line):
                    num, content = re.match(r'^(\d+)\.\s*(.+)$', line).groups()
                    formatted_lines.append(
                        f'<div style="display:flex; margin:6px 0;">'
                        f'<span style="min-width:28px; font-weight:650; color:#6B5B8A;">{num}.</span>'
                        f'<span style="flex:1; line-height:1.5;">{content}</span>'
                        f'</div>'
                    )

                # 點列清單
                elif line.startswith('- ') or line.startswith('• '):
                    content = line[2:].strip()
                    formatted_lines.append(f'<div style="margin:4px 0 4px 20px;">• {content}</div>')

                # 普通段落
                else:
                    formatted_lines.append(f'<p style="margin:6px 0; line-height:1.6; color:#334455;">{line}</p>')

            result_html = ''.join(formatted_lines)

            return {
                "answer": result_html,
                "has_sources": False,
                "sources": [],
                "classification": clf
            }

    except Exception as e:
        print(f"❌ RAG / LLM 處理錯誤: {e}")
        return {
            "answer": "<p style='color:#8B6B6B;'>抱歉，處理您的問題時發生錯誤，請稍後再試。</p>",
            "has_sources": False,
            "sources": []
        }
