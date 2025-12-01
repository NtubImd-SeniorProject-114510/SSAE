import os
import re
import time
import shutil
import markdown
import tempfile
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
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

current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
PDF_DIRECTORY = os.path.join(project_root, "uploaded_files")
PERSIST_DIRECTORY = os.path.join(project_root, "chroma_db_data")

# ==================== 終端機視覺化工具 (保持不變) ====================
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

    @staticmethod
    def print_progress(current: int, total: int, prefix: str = "進度"):
        bar_length = 30
        if total == 0: total = 1
        filled = int(bar_length * current / total)
        bar = '█' * filled + '░' * (bar_length - filled)
        percent = 100 * current / total
        print(f"\r{prefix}: |{bar}| {percent:.1f}% ({current}/{total})", end='', flush=True)
        if current == total:
            print()

# ==================== 初始化 AI 模型 ====================
TerminalUI.print_header("🤖 初始化 AI 模型")
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
    TerminalUI.print_success("模型載入成功")
except Exception as e:
    TerminalUI.print_error(f"模型載入失敗: {e}")

# ==================== 功能函式 ====================

def load_pdf_documents():
    TerminalUI.print_step(1, "載入 PDF 文件")
    all_docs = []
    if not os.path.exists(PDF_DIRECTORY):
        TerminalUI.print_warning(f"找不到資料夾：{PDF_DIRECTORY}")
        return []
    
    pdf_files = [f for f in os.listdir(PDF_DIRECTORY) if f.endswith(".pdf")]
    TerminalUI.print_info(f"找到 {len(pdf_files)} 個 PDF", 1)
    
    for i, filename in enumerate(pdf_files, 1):
        try:
            loader = PyPDFLoader(os.path.join(PDF_DIRECTORY, filename))
            docs = loader.load()
            all_docs.extend(docs)
            if i % 10 == 0: print(f"已載入 {i} 個檔案...", end="\r")
        except:
            pass
    
    TerminalUI.print_success(f"總共載入 {len(all_docs)} 頁文件")
    return all_docs

def split_documents(documents):
    TerminalUI.print_step(2, "分割文件")
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100, add_start_index=True)
    splits = splitter.split_documents(documents)
    TerminalUI.print_success(f"分割成 {len(splits)} 個文件塊")
    return splits

def build_vector_store_locally(splits):
    """
    ✅ 修正版：在暫存資料夾建立，避開 OneDrive 鎖定
    """
    TerminalUI.print_step(3, "建立向量資料庫 (防鎖死模式)")
    
    # 1. 建立一個暫存資料夾 (在 C:\Temp 之類的地方，OneDrive 管不到)
    temp_dir = tempfile.mkdtemp(prefix="chroma_build_")
    TerminalUI.print_info(f"使用暫存區進行建置: {temp_dir}", 1)
    
    try:
        # 2. 在暫存區建立資料庫
        vectorstore = Chroma(
            embedding_function=embeddings,
            persist_directory=temp_dir
        )
        
        total_splits = len(splits)
        batch_size = 10 
        
        TerminalUI.print_info(f"開始分批寫入...", 1)

        for i in range(0, total_splits, batch_size):
            batch = splits[i : i + batch_size]
            try:
                vectorstore.add_documents(batch)
                TerminalUI.print_progress(min(i + batch_size, total_splits), total_splits, "向量化")
                time.sleep(1.5) # 稍微加速一點，因為本地IO不會鎖
            except Exception as e:
                TerminalUI.print_error(f"批次錯誤 (重試中): {e}")
                time.sleep(10)
                vectorstore.add_documents(batch)
        
        # 3. 確保資料寫入硬碟
        del vectorstore 
        time.sleep(2) # 等待釋放
        
        # 4. 搬移回專案目錄
        TerminalUI.print_step(4, "搬移資料庫回專案目錄")
        
        # 如果目標資料夾已存在，先強制刪除 (這時候 Python 沒在用它，應該刪得掉)
        if os.path.exists(PERSIST_DIRECTORY):
            TerminalUI.print_info("清理舊資料庫...", 1)
            # 嘗試多次刪除，怕 OneDrive 還咬著
            for _ in range(3):
                try:
                    shutil.rmtree(PERSIST_DIRECTORY)
                    break
                except:
                    time.sleep(1)
        
        # 將暫存資料夾搬移過來
        shutil.copytree(temp_dir, PERSIST_DIRECTORY, dirs_exist_ok=True)
        TerminalUI.print_success(f"資料庫已成功部署至: {PERSIST_DIRECTORY}")
        
        # 回傳新的 vectorstore 物件
        return True
    
    except Exception as e:
        TerminalUI.print_error(f"建置過程發生嚴重錯誤: {e}")
        return None
    finally:
        # 清理暫存區
        try:
            shutil.rmtree(temp_dir)
        except:
            pass

def load_existing_vector_store():
    if not os.path.exists(PERSIST_DIRECTORY):
        return None
    return Chroma(persist_directory=PERSIST_DIRECTORY, embedding_function=embeddings)

def create_advanced_rag_chain(retriever):
    system_prompt = (
        "You are a helpful assistant for answering questions about National Taipei University of Business (NTUB). "
        "Use the following retrieved context to answer the question. "
        "If you don't know the answer, just say you don't know. "
        "You must answer **only in Traditional Chinese**. "
        "\n\n{context}"
    )
    prompt = ChatPromptTemplate.from_messages([("system", system_prompt), ("human", "{input}")])
    qa_chain = create_stuff_documents_chain(llm, prompt)
    return create_retrieval_chain(retriever, qa_chain)

# ==================== 初始化系統 ====================

# ✅ [控制開關] 
# 在這裡設定為 False，這樣雲端部署時不會跑
# 但下方的 __main__ 區塊會強制執行 True
BUILD_DB_MODE = False  

vectorstore = None
advanced_rag_chain = None

if BUILD_DB_MODE:
    pass # 邏輯移到 main
else:
    # 讀取模式
    if os.path.exists(PERSIST_DIRECTORY):
        vectorstore = load_existing_vector_store()

if vectorstore:
    retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 2})
    advanced_rag_chain = create_advanced_rag_chain(retriever)
    TerminalUI.print_success("RAG 系統載入完成 (讀取模式)")

# ==================== 查詢函式 ====================
def ask_question(question: str, conversation_history: list = None) -> dict:
    if not advanced_rag_chain:
        return {"answer": "系統維護中 (資料庫重建中)", "has_sources": False, "sources": []}
    try:
        response = advanced_rag_chain.invoke({"input": question})
        raw_answer = response["answer"].strip()
        source_documents = response.get("context", [])
        pdf_sources = list(set([os.path.basename(doc.metadata.get('source', '')) for doc in source_documents]))
        return {"answer": markdown.markdown(raw_answer), "has_sources": True, "sources": pdf_sources}
    except Exception as e:
        return {"answer": f"發生錯誤: {str(e)}", "has_sources": False, "sources": []}

# ==================== 手動執行區塊 ====================
if __name__ == "__main__":
    TerminalUI.print_header("🔥 強制執行資料庫重建 🔥")
    # 強制執行建置流程
    docs = load_pdf_documents()
    if docs:
        splits = split_documents(docs)
        # 呼叫新的防鎖死建置函式
        success = build_vector_store_locally(splits)
        
        if success:
            TerminalUI.print_header("🎉 全部完成！現在可以上傳到 GitHub 了")
            print("(注意：請勿在此時執行讀取測試，以免 OneDrive 鎖定檔案)")