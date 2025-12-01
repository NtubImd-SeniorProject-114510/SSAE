import os
import re
import time
import markdown
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_openai import AzureOpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import AzureChatOpenAI
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain

# 載入 .env
load_dotenv()

# ==================== 路徑設定 ====================
# 取得當前檔案 (views_rag.py) 的位置 -> web_app/
current_dir = os.path.dirname(os.path.abspath(__file__))
# 取得專案根目錄 (往上一層) -> SSAE_11056030_f/
project_root = os.path.dirname(current_dir)
# 設定向量資料庫儲存路徑
PERSIST_DIRECTORY = os.path.join(project_root, "chroma_db_data")
# 設定 PDF 資料夾路徑
PDF_DIRECTORY = os.path.join(project_root, "uploaded_files")

# ==================== 終端機視覺化工具 ====================
class TerminalColors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

class TerminalUI:
    ENABLE_VISUAL = True
   
    @staticmethod
    def print_header(text: str):
        print(f"\n{TerminalColors.HEADER}{TerminalColors.BOLD}{'='*60}{TerminalColors.ENDC}")
        print(f"{TerminalColors.HEADER}{TerminalColors.BOLD}{text:^60}{TerminalColors.ENDC}")
        print(f"{TerminalColors.HEADER}{TerminalColors.BOLD}{'='*60}{TerminalColors.ENDC}\n")
   
    @staticmethod
    def print_step(step_num: int, text: str):
        print(f"\n{TerminalColors.OKBLUE}{TerminalColors.BOLD}[步驟 {step_num}]{TerminalColors.ENDC} {text}")
   
    @staticmethod
    def print_success(text: str):
        print(f"{TerminalColors.OKGREEN}✓ {text}{TerminalColors.ENDC}")
   
    @staticmethod
    def print_warning(text: str):
        print(f"{TerminalColors.WARNING}⚠ {text}{TerminalColors.ENDC}")
   
    @staticmethod
    def print_error(text: str):
        print(f"{TerminalColors.FAIL}✗ {text}{TerminalColors.ENDC}")
   
    @staticmethod
    def print_info(text: str, indent: int = 0):
        prefix = "  " * indent
        print(f"{prefix}{TerminalColors.OKCYAN}→{TerminalColors.ENDC} {text}")

# ==================== 初始化 AI 模型 ====================
TerminalUI.print_header("🤖 初始化 AI 模型")

# 初始化 Embeddings (必要的，即使是讀取資料庫也需要)
try:
    embeddings = AzureOpenAIEmbeddings(
        api_key=os.getenv("AZURE_OPENAI_API_KEY"),
        api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
        azure_deployment=os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME")
    )
   
    llm = AzureChatOpenAI(
        api_key=os.getenv("AZURE_OPENAI_API_KEY"),
        api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
        azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
        azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
    )
    TerminalUI.print_success("AI 模型載入成功")
except Exception as e:
    TerminalUI.print_error(f"AI 模型載入失敗: {e}")
    embeddings = None
    llm = None

# ==================== 功能函式 (保留以供 views.py 呼叫) ====================

def load_pdf_documents():
    """讀取 PDF 文件"""
    all_docs = []
    if not os.path.exists(PDF_DIRECTORY):
        return []
    pdf_files = [f for f in os.listdir(PDF_DIRECTORY) if f.endswith(".pdf")]
    for filename in pdf_files:
        try:
            loader = PyPDFLoader(os.path.join(PDF_DIRECTORY, filename))
            all_docs.extend(loader.load())
        except:
            pass
    return all_docs

def split_documents(documents):
    """分割文件"""
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100, add_start_index=True)
    return splitter.split_documents(documents)

def create_vector_store(splits):
    """建立向量資料庫 (這裡通常只在手動更新時呼叫)"""
    # 這裡的邏輯可以保持簡單，因為我們不再自動呼叫它
    return Chroma.from_documents(documents=splits, embedding=embeddings, persist_directory=PERSIST_DIRECTORY)

def create_advanced_rag_chain(retriever):
    """建立 RAG 鏈"""
    system_prompt = (
        "You are a helpful assistant for answering questions about National Taipei University of Business (NTUB). "
        "Use the following retrieved context to answer the question. "
        "If you don't know the answer, just say you don't know. "
        "You must answer **only in Traditional Chinese**. "
        "Always clearly mention that the information is from NTUB regulations. "
        "\n\n{context}"
    )
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}"),
    ])
    qa_chain = create_stuff_documents_chain(llm, prompt)
    return create_retrieval_chain(retriever, qa_chain)

# ==================== 🚀 核心修正：系統初始化邏輯 ====================

TerminalUI.print_header("🚀 初始化 RAG 系統 (讀取模式)")

vectorstore = None
advanced_rag_chain = None

# ✅ 修正：直接讀取硬碟上的資料庫，不再重建
if os.path.exists(PERSIST_DIRECTORY) and embeddings:
    try:
        TerminalUI.print_info(f"發現現有資料庫: {PERSIST_DIRECTORY}", 1)
        vectorstore = Chroma(
            persist_directory=PERSIST_DIRECTORY,
            embedding_function=embeddings
        )
        TerminalUI.print_success("成功載入本地向量資料庫")
       
        # 建立檢索鏈
        retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 2})
        advanced_rag_chain = create_advanced_rag_chain(retriever)
        TerminalUI.print_success("RAG 檢索鏈準備就緒")
       
    except Exception as e:
        TerminalUI.print_error(f"載入資料庫失敗: {e}")
        TerminalUI.print_warning("請先執行 system.py 重建資料庫")
else:
    TerminalUI.print_warning(f"找不到資料庫資料夾 ({PERSIST_DIRECTORY}) 或 Embeddings 初始化失敗")
    TerminalUI.print_info("請先執行 system.py 建立資料庫，再啟動伺服器")

# ==================== 查詢函式 ====================

def ask_question(question: str, conversation_history: list = None) -> dict:
    if not advanced_rag_chain:
        return {
            "answer": "系統維護中 (資料庫未載入，請確認伺服器日誌)。",
            "has_sources": False,
            "sources": []
        }

    try:
        full_question = question
        if conversation_history:
             recent = conversation_history[-3:] # 取最近3句就好，避免太長
             history_context = "\n".join([f"Q: {msg['question']}\nA: {msg['answer']}" for msg in recent])
             full_question = f"之前的對話：\n{history_context}\n\n現在的問題：{question}"

        response = advanced_rag_chain.invoke({"input": full_question})
        raw_answer = response["answer"].strip()
       
        source_documents = response.get("context", [])
        pdf_sources = []
        for doc in source_documents:
            if hasattr(doc, 'metadata') and 'source' in doc.metadata:
                name = os.path.basename(doc.metadata['source'])
                if name not in pdf_sources:
                    pdf_sources.append(name)
       
        formatted_answer = markdown.markdown(raw_answer)

        return {
            "answer": formatted_answer,
            "has_sources": len(pdf_sources) > 0,
            "sources": pdf_sources
        }
       
    except Exception as e:
        TerminalUI.print_error(f"RAG 查詢錯誤: {str(e)}")
        return {
            "answer": "抱歉，AI 暫時無法回答您的問題 (Rate Limit 或 連線錯誤)。",
            "has_sources": False,
            "sources": []
        }