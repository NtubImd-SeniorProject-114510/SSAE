import os
import re
import markdown
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.vectorstores import Chroma
from langchain_openai import AzureOpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain.chat_models import AzureChatOpenAI
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain

# 載入 .env
load_dotenv()

def test_mongo_connection():
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

# 初始化 LLM
llm = AzureChatOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
)

# 初始化 Embedding 模型
embeddings = AzureOpenAIEmbeddings(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    azure_deployment=os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME")
)

# 讀取 PDF 文件
def load_pdf_documents():
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

# 分割文件
def split_documents(documents):
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100, add_start_index=True)
    return splitter.split_documents(documents)

# 建立向量資料庫
def create_vector_store(splits):
    return Chroma.from_documents(documents=splits, embedding=embeddings)

# 建立進階 RAG 鏈
def create_advanced_rag_chain(retriever):
    system_prompt = (
        "You are a helpful assistant for answering questions about National Taipei University of Business (NTUB). "
        "Use the following retrieved context to answer the question. "
        "If you don't know the answer, just say you don't know, and do not make up anything. "
        "You must answer **only in Traditional Chinese**, never use Simplified Chinese. "
        "Your tone should be lively and cute (like a friendly NTUB student helper), "
        "but your information must be accurate and based on the context. "
        "Always clearly mention that the information is from NTUB regulations, by saying things like '根據國立臺北商業大學的校規顯示'. "
        "Use bold (** **) or headers (like # or ##) to highlight key points and make the answer easier to read. "
        "When listing items, use proper numbering (1. 2. 3.) or bullet points (•) with consistent spacing. "
        "Organize your response with clear structure and consistent formatting.\n\n{context}"
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])
    qa_chain = create_stuff_documents_chain(llm, prompt)
    return create_retrieval_chain(retriever, qa_chain)

def format_text_with_proper_alignment(text):
    """改進的文字格式化，保持原本緊湊但讓編號對齊"""
    if not text:
        return ""
    
    # 統一換行符
    text = re.sub(r'\r\n|\r', '\n', text)
    
    # 處理粗體
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    
    # 處理編號列表，確保對齊
    def replace_numbered_item(match):
        num = match.group(1)
        content = match.group(2).strip()
        return f'<div style="display:flex;margin:4px 0;"><span style="min-width:24px;font-weight:bold;color:#2563eb;">{num}.</span><span style="flex:1;">{content}</span></div>'
    
    text = re.sub(r'^(\d+)\.\s*(.+)$', replace_numbered_item, text, flags=re.MULTILINE)
    
    # 簡單的段落處理
    lines = text.split('\n')
    result = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # 如果是HTML標籤，直接加入
        if line.startswith('<div') or line.startswith('<strong'):
            result.append(line)
        else:
            result.append(f'<p style="margin:4px 0;line-height:1.5;">{line}</p>')
    
    return ''.join(result)

# 先測試 MongoDB 連線
print("🚀 測試 MongoDB 連線...")
test_mongo_connection()

# 初始化 RAG 系統
print("🚀 初始化進階 RAG 系統...")
docs = load_pdf_documents()
splits = split_documents(docs)
vectorstore = create_vector_store(splits)
retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 2})
advanced_rag_chain = create_advanced_rag_chain(retriever)
print("✅ 進階 RAG 系統初始化完成。")

# 修正後的查詢函式
# 只需要替換您原本的 ask_question 函式即可：
def ask_question(question: str, conversation_history: list = None) -> str:
    try:
        # 🔥 如果有歷史對話，就加入到當前問題中
        if conversation_history:
            # 只取最近幾輪對話，避免太長
            recent_history = conversation_history[-8:] if len(conversation_history) > 8 else conversation_history
            
            history_context = "之前的對話內容：\n"
            for msg in recent_history:
                history_context += f"Q: {msg['question']}\nA: {msg['answer']}\n\n"
            
            # 將歷史對話和新問題結合
            full_question = f"{history_context}現在的新問題：{question}"
        else:
            full_question = question
            
        response = advanced_rag_chain.invoke({"input": full_question})
        raw_answer = response["answer"].strip()
        
        # 獲取使用的文檔來源
        source_documents = response.get("context", [])
        pdf_sources = []
        
        for doc in source_documents:
            if hasattr(doc, 'metadata') and 'source' in doc.metadata:
                pdf_path = doc.metadata['source']
                pdf_name = os.path.basename(pdf_path)
                if pdf_name not in pdf_sources:
                    pdf_sources.append(pdf_name)
                    
        # 先處理所有粗體標記，避免後續處理時被破壞
        raw_answer = re.sub(r'\*\*([^*\n]+?)\*\*', r'<strong style="color:#4A5B73; font-weight:700;">\1</strong>', raw_answer)
        
        # 逐行處理
        lines = raw_answer.split('\n')
        formatted_lines = []
        
        for line in lines:
            line = line.strip()
            
            # 跳過空行
            if not line:
                continue
            
            # 處理 ### 標題
            if line.startswith('###'):
                title = line.replace('###', '').strip()
                formatted_line = f'<h3 style="color:#5B7296; margin:12px 0 6px 0; font-weight:650; font-size:1.2em;">{title}</h3>'
                formatted_lines.append(formatted_line)
                continue
            
            # 處理 ## 標題
            elif line.startswith('##'):
                title = line.replace('##', '').strip()
                formatted_line = f'<h2 style="color:#4A668A; margin:15px 0 8px 0; font-weight:650; font-size:1.4em;">{title}</h2>'
                formatted_lines.append(formatted_line)
                continue
            
            # 處理 # 標題
            elif line.startswith('#'):
                title = line.replace('#', '').strip()
                formatted_line = f'<h1 style="color:#365073; margin:18px 0 10px 0; font-weight:650; font-size:1.6em;">{title}</h1>'
                formatted_lines.append(formatted_line)
                continue
            
            # 處理編號列表
            numbered_match = re.match(r'^(\d+)\.\s*(.+)$', line)
            if numbered_match:
                num = numbered_match.group(1)
                content = numbered_match.group(2)
                formatted_line = f'<div style="display:flex; margin:6px 0; align-items:flex-start;"><span style="min-width:28px; font-weight:650; color:#6B5B8A; flex-shrink:0;">{num}.</span><span style="flex:1; line-height:1.5;">{content}</span></div>'
                formatted_lines.append(formatted_line)
                continue
            
            # 處理以破折號或點開頭的列表項
            elif line.startswith('- ') or line.startswith('• '):
                content = line[2:].strip()
                formatted_line = f'<div style="margin:4px 0 4px 20px; line-height:1.5;">• {content}</div>'
                formatted_lines.append(formatted_line)
                continue
            
            # 處理普通段落
            else:
                formatted_lines.append(f'<p style="margin:6px 0; line-height:1.6; color:#334455;">{line}</p>')
        
        # 合併所有格式化的行
        result = ''.join(formatted_lines)
        
        return {
            "answer": result,
            "has_sources": len(pdf_sources) > 0,
            "sources": pdf_sources
        }
        
    except Exception as e:
        error_msg = f"處理問題時發生錯誤: {str(e)}"
        print(f"❌ RAG 錯誤: {error_msg}")
        return {
            "answer": f"<p style='color:#8B6B6B;'>抱歉，我在處理您的問題時遇到了一些困難。請稍後再試或換個方式提問。</p>",
            "has_sources": False,
            "sources": []
        }