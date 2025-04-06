from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain.vectorstores import Chroma
from langchain.document_loaders import DirectoryLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores import FAISS
from fastapi import FastAPI
import uvicorn

app = FastAPI()

def index_codebase(directory):
    try:
        loader = DirectoryLoader(
            directory,
            glob=["**/*.js", "**/*.ts", "**/*.jsx", "**/*.tsx"],
            loader_cls=TextLoader
        )
        documents = loader.load()
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        chunks = text_splitter.split_documents(documents)
        embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
        db = FAISS.from_documents(
            documents=chunks,
            embedding=embeddings
        )
        db.save_local("faiss_index")
        return True
    except Exception as e:
        print(f"Error indexing codebase: {e}")
        return False

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.post("/load_repo")
async def load_repo(repo_path: str):
    index_codebase(repo_path)
    return {"message": "Codebase indexed successfully"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
    