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
from langchain.vectorstores import Chroma
from langchain_openai import AzureOpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain.chat_models import AzureChatOpenAI
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain

# 載入 .env
load_dotenv()


# ==================== 終端機視覺化工具 ====================

class TerminalColors:
    """終端機顏色代碼"""
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
    """終端機視覺化輸出工具"""
    
    ENABLE_VISUAL = True
    
    @staticmethod
    def set_visual_mode(enabled: bool):
        """設定是否啟用視覺化輸出"""
        TerminalUI.ENABLE_VISUAL = enabled
    
    @staticmethod
    def print_header(text: str):
        """列印大標題"""
        if not TerminalUI.ENABLE_VISUAL:
            return
        print(f"\n{TerminalColors.HEADER}{TerminalColors.BOLD}{'='*60}{TerminalColors.ENDC}")
        print(f"{TerminalColors.HEADER}{TerminalColors.BOLD}{text:^60}{TerminalColors.ENDC}")
        print(f"{TerminalColors.HEADER}{TerminalColors.BOLD}{'='*60}{TerminalColors.ENDC}\n")
    
    @staticmethod
    def print_step(step_num: int, text: str):
        """列印步驟標題"""
        if not TerminalUI.ENABLE_VISUAL:
            return
        print(f"\n{TerminalColors.OKBLUE}{TerminalColors.BOLD}[步驟 {step_num}]{TerminalColors.ENDC} {text}")
    
    @staticmethod
    def print_success(text: str):
        """列印成功訊息"""
        if not TerminalUI.ENABLE_VISUAL:
            return
        print(f"{TerminalColors.OKGREEN}✓ {text}{TerminalColors.ENDC}")
    
    @staticmethod
    def print_warning(text: str):
        """列印警告訊息"""
        if not TerminalUI.ENABLE_VISUAL:
            return
        print(f"{TerminalColors.WARNING}⚠ {text}{TerminalColors.ENDC}")
    
    @staticmethod
    def print_error(text: str):
        """列印錯誤訊息"""
        if not TerminalUI.ENABLE_VISUAL:
            return
        print(f"{TerminalColors.FAIL}✗ {text}{TerminalColors.ENDC}")
    
    @staticmethod
    def print_info(text: str, indent: int = 0):
        """列印資訊"""
        if not TerminalUI.ENABLE_VISUAL:
            return
        prefix = "  " * indent
        print(f"{prefix}{TerminalColors.OKCYAN}→{TerminalColors.ENDC} {text}")
    
    @staticmethod
    def print_progress(current: int, total: int, prefix: str = "進度"):
        """列印進度條"""
        if not TerminalUI.ENABLE_VISUAL:
            return
        bar_length = 30
        filled = int(bar_length * current / total)
        bar = '█' * filled + '░' * (bar_length - filled)
        percent = 100 * current / total
        print(f"\r{prefix}: |{bar}| {percent:.1f}% ({current}/{total})", end='', flush=True)
        if current == total:
            print()
    
    @staticmethod
    def simulate_processing(duration: float = 0.5, message: str = "處理中"):
        """模擬處理過程（帶進度條）"""
        if not TerminalUI.ENABLE_VISUAL:
            time.sleep(duration)
            return
        
        steps = 20
        for i in range(steps + 1):
            TerminalUI.print_progress(i, steps, message)
            time.sleep(duration / steps)


# ==================== MongoDB 連線測試 ====================

def test_mongo_connection():
    """測試 MongoDB 連線"""
    TerminalUI.print_header("🔌 測試 MongoDB 連線")
    
    MONGO_URI = os.getenv("MONGO_URI")
    if not MONGO_URI:
        TerminalUI.print_error("找不到 MONGODB_URI 環境變數")
        return
    
    try:
        TerminalUI.print_info("正在連接 MongoDB...", 1)
        TerminalUI.simulate_processing(0.8, "連接中")
        
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
        client.admin.command('ping')
        
        TerminalUI.print_success("MongoDB 連線成功")
        
    except ConnectionFailure:
        TerminalUI.print_error("MongoDB 連線失敗")
    except Exception as e:
        TerminalUI.print_error(f"MongoDB 連線錯誤: {e}")


# ==================== 初始化 AI 模型 ====================

TerminalUI.print_header("🤖 初始化 AI 模型")

TerminalUI.print_info("載入 Azure OpenAI LLM...", 1)
llm = AzureChatOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
)
TerminalUI.print_success("LLM 載入成功")

TerminalUI.print_info("載入 Embedding 模型...", 1)
embeddings = AzureOpenAIEmbeddings(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    azure_deployment=os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME")
)
TerminalUI.print_success("Embedding 模型載入成功")


# ==================== 文件處理函式 ====================

def load_pdf_documents():
    """讀取 PDF 文件"""
    TerminalUI.print_step(1, "載入 PDF 文件")
    
    current_dir = os.path.dirname(__file__)
    parent_dir = os.path.dirname(current_dir)
    pdf_dir = os.path.join(parent_dir, "uploaded_files")
    
    all_docs = []
    
    if not os.path.exists(pdf_dir):
        TerminalUI.print_warning(f"找不到資料夾：{pdf_dir}")
        return []
    
    pdf_files = [f for f in os.listdir(pdf_dir) if f.endswith(".pdf")]
    
    if not pdf_files:
        TerminalUI.print_warning("資料夾中沒有 PDF 檔案")
        return []
    
    TerminalUI.print_info(f"找到 {len(pdf_files)} 個 PDF 檔案", 1)
    
    for i, filename in enumerate(pdf_files, 1):
        full_path = os.path.join(pdf_dir, filename)
        TerminalUI.print_info(f"載入 [{i}/{len(pdf_files)}]: {filename}", 1)
        
        try:
            loader = PyPDFLoader(full_path)
            docs = loader.load()
            all_docs.extend(docs)
            TerminalUI.print_success(f"成功載入 {len(docs)} 頁")
        except Exception as e:
            TerminalUI.print_error(f"載入失敗: {e}")
    
    TerminalUI.print_success(f"總共載入 {len(all_docs)} 頁文件")
    return all_docs


def split_documents(documents):
    """分割文件"""
    TerminalUI.print_step(2, "分割文件")
    TerminalUI.print_info("使用 RecursiveCharacterTextSplitter...", 1)
    TerminalUI.print_info("chunk_size=500, chunk_overlap=100", 1)
    
    TerminalUI.simulate_processing(0.8, "分割中")
    
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500, 
        chunk_overlap=100, 
        add_start_index=True
    )
    splits = splitter.split_documents(documents)
    
    TerminalUI.print_success(f"分割成 {len(splits)} 個文件塊")
    return splits


def create_vector_store(splits):
    """建立向量資料庫"""
    TerminalUI.print_step(3, "建立向量資料庫")
    TerminalUI.print_info("使用 Chroma 向量資料庫...", 1)
    TerminalUI.print_info(f"正在處理 {len(splits)} 個文件塊...", 1)
    
    # 模擬向量化過程
    for i in range(0, len(splits), max(1, len(splits) // 10)):
        TerminalUI.print_progress(i, len(splits), "向量化")
        time.sleep(0.1)
    TerminalUI.print_progress(len(splits), len(splits), "向量化")
    
    vectorstore = Chroma.from_documents(documents=splits, embedding=embeddings)
    
    TerminalUI.print_success("向量資料庫建立完成")
    return vectorstore


def create_advanced_rag_chain(retriever):
    """建立進階 RAG 鏈"""
    TerminalUI.print_step(4, "建立 RAG 檢索鏈")
    TerminalUI.print_info("設定系統提示詞...", 1)
    
    system_prompt = (
        "You are a helpful assistant for answering questions about National Taipei University of Business (NTUB). "
        "Use the following retrieved context to answer the question. "
        "If you don't know the answer, just say you don't know, and do not make up anything. "
        "You must answer **only in Traditional Chinese**, never use Simplified Chinese. "
        "Your tone should be friendly and professional (like a knowledgeable NTUB student helper), "
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
    
    TerminalUI.print_info("建立文件鏈...", 1)
    qa_chain = create_stuff_documents_chain(llm, prompt)
    
    TerminalUI.print_info("建立檢索鏈...", 1)
    rag_chain = create_retrieval_chain(retriever, qa_chain)
    
    TerminalUI.print_success("RAG 檢索鏈建立完成")
    return rag_chain


def format_text_with_proper_alignment(text):
    """改進的文字格式化，保持原本緊湊但讓編號對齊"""
    if not text:
        return ""
    
    text = re.sub(r'\r\n|\r', '\n', text)
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    
    def replace_numbered_item(match):
        num = match.group(1)
        content = match.group(2).strip()
        return f'<div style="display:flex;margin:4px 0;"><span style="min-width:24px;font-weight:bold;color:#2563eb;">{num}.</span><span style="flex:1;">{content}</span></div>'
    
    text = re.sub(r'^(\d+)\.\s*(.+)$', replace_numbered_item, text, flags=re.MULTILINE)
    
    lines = text.split('\n')
    result = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        if line.startswith('<div') or line.startswith('<strong'):
            result.append(line)
        else:
            result.append(f'<p style="margin:4px 0;line-height:1.5;">{line}</p>')
    
    return ''.join(result)


# ==================== 初始化系統 ====================

TerminalUI.print_header("🚀 初始化 RAG 系統")

# 測試 MongoDB 連線
test_mongo_connection()
time.sleep(0.3)

# 載入文件
docs = load_pdf_documents()
time.sleep(0.3)

# 分割文件
splits = split_documents(docs)
time.sleep(0.3)

# 建立向量資料庫
vectorstore = create_vector_store(splits)
time.sleep(0.3)

# 建立檢索器
TerminalUI.print_info("設定檢索器參數...", 1)
retriever = vectorstore.as_retriever(
    search_type="similarity", 
    search_kwargs={"k": 2}
)
TerminalUI.print_success("檢索器設定完成 (top-k=2)")

# 建立 RAG 鏈
advanced_rag_chain = create_advanced_rag_chain(retriever)

TerminalUI.print_header("✅ RAG 系統初始化完成")


# ==================== 查詢函式 ====================

def ask_question(question: str, conversation_history: list = None) -> dict:
    """
    詢問問題並取得回答
    
    Args:
        question: 使用者的問題
        conversation_history: 對話歷史記錄
        
    Returns:
        dict: 包含答案、來源等資訊
    """
    try:
        TerminalUI.print_header("💬 處理問題")
        TerminalUI.print_info(f"問題: {question}", 1)
        
        # 處理對話歷史
        if conversation_history:
            recent_history = conversation_history[-8:] if len(conversation_history) > 8 else conversation_history
            
            TerminalUI.print_info(f"包含 {len(recent_history)} 輪對話歷史", 1)
            
            history_context = "之前的對話內容：\n"
            for msg in recent_history:
                history_context += f"Q: {msg['question']}\nA: {msg['answer']}\n\n"
            
            full_question = f"{history_context}現在的新問題：{question}"
        else:
            full_question = question
            TerminalUI.print_info("首次提問（無對話歷史）", 1)
        
        # 檢索相關文件
        TerminalUI.print_step(1, "檢索相關文件")
        TerminalUI.simulate_processing(0.8, "檢索中")
        
        # 生成回答
        TerminalUI.print_step(2, "生成回答")
        TerminalUI.simulate_processing(1.2, "AI 思考中")
        
        response = advanced_rag_chain.invoke({"input": full_question})
        raw_answer = response["answer"].strip()
        
        # 獲取來源文件
        source_documents = response.get("context", [])
        pdf_sources = []
        
        for doc in source_documents:
            if hasattr(doc, 'metadata') and 'source' in doc.metadata:
                pdf_path = doc.metadata['source']
                pdf_name = os.path.basename(pdf_path)
                if pdf_name not in pdf_sources:
                    pdf_sources.append(pdf_name)
        
        if pdf_sources:
            TerminalUI.print_success(f"找到 {len(pdf_sources)} 個來源文件")
            for source in pdf_sources:
                TerminalUI.print_info(f"• {source}", 2)
        else:
            TerminalUI.print_warning("未找到明確的來源文件")
        
        # 格式化回答
        TerminalUI.print_step(3, "格式化回答")
        
        # 處理粗體
        raw_answer = re.sub(
            r'\*\*([^*\n]+?)\*\*', 
            r'<strong style="color:#4A5B73; font-weight:700;">\1</strong>', 
            raw_answer
        )
        
        # 逐行處理
        lines = raw_answer.split('\n')
        formatted_lines = []
        
        for line in lines:
            line = line.strip()
            
            if not line:
                continue
            
            # 處理標題
            if line.startswith('###'):
                title = line.replace('###', '').strip()
                formatted_line = f'<h3 style="color:#5B7296; margin:12px 0 6px 0; font-weight:650; font-size:1.2em;">{title}</h3>'
                formatted_lines.append(formatted_line)
                continue
            
            elif line.startswith('##'):
                title = line.replace('##', '').strip()
                formatted_line = f'<h2 style="color:#4A668A; margin:15px 0 8px 0; font-weight:650; font-size:1.4em;">{title}</h2>'
                formatted_lines.append(formatted_line)
                continue
            
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
            
            # 處理列表項
            elif line.startswith('- ') or line.startswith('• '):
                content = line[2:].strip()
                formatted_line = f'<div style="margin:4px 0 4px 20px; line-height:1.5;">• {content}</div>'
                formatted_lines.append(formatted_line)
                continue
            
            # 處理普通段落
            else:
                formatted_lines.append(f'<p style="margin:6px 0; line-height:1.6; color:#334455;">{line}</p>')
        
        result = ''.join(formatted_lines)
        
        TerminalUI.print_success("回答生成完成")
        TerminalUI.print_header("✅ 處理完成")
        
        return {
            "answer": result,
            "has_sources": len(pdf_sources) > 0,
            "sources": pdf_sources
        }
        
    except Exception as e:
        error_msg = f"處理問題時發生錯誤: {str(e)}"
        TerminalUI.print_error(error_msg)
        print(f"❌ RAG 錯誤: {error_msg}")
        
        return {
            "answer": f"<p style='color:#8B6B6B;'>抱歉，我在處理您的問題時遇到了一些困難。請稍後再試或換個方式提問。</p>",
            "has_sources": False,
            "sources": []
        }