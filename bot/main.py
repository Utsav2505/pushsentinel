from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain.vectorstores import Chroma
from langchain.document_loaders import DirectoryLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores import FAISS
from langchain.prompts import PromptTemplate
from langchain.tools import Tool
from langchain.chains import LLMChain
from langchain_google_genai import ChatGoogleGenerativeAI
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
import os

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
        db.save_local("indexed_codebase"+directory.split("/")[-1])
        return True
    
    except Exception as e:
        print(f"Error indexing codebase: {e}")
        return False

def summarize(directory):
    try:
        summary_prompt = PromptTemplate.from_template("""
        You're an experienced software engineer.
                                                      
        Summarize the purpose of the following code file in 1–2 lines.
        Focus on what it does, not how.

        File path: {file_path}
        Code:
        {code}
        """)
        llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0)
        chain = LLMChain(llm=llm, prompt=summary_prompt)
        summary = []
        for root, _, files in os.walk(directory):
            for file in files:
                if file.endswith((".js", ".ts", ".jsx", ".tsx", ".json", ".md", ".css")):
                    path = os.path.join(root, file)
                    try:
                        loader = TextLoader(path, encoding="utf-8")
                        documents = loader.load()
                        text = documents[0].page_content[:1500]  # Limit to 1500 chars
                        result = chain.run({"code": text, "file_path": path})
                        summary.append(f"### {file}\n`{path}`\n> {result.strip()}\n")
                    except Exception as e:
                        summary.append(f"### {file}\n`{path}`\n> Failed to load: {e}\n")
        return "\n".join(summary)

    except Exception as e:
        print(f"Error summarizing codebase: {e}")
        return None

@app.get("/")
async def root():
    return {"message": "Hello World"}

class LoadRepo(BaseModel):
    repo_path: str
@app.post("/load_repo")
async def load_repo(repo: LoadRepo):
    index_codebase(repo.repo_path)
    return {"message": "Codebase indexed successfully"}


@app.post("/summarize")
async def summarize_codebase(repo: LoadRepo):
    try:
        summary = summarize(repo.repo_path)
        if summary:
            return {"summary": summary}

        else:
            return {"error": "Failed to summarize codebase"}
    except Exception as e:
        print(f"Error summarizing codebase: {e}")
        return {"error": str(e)}


if __name__ == "__main__":
    os.environ["GOOGLE_API_KEY"] = "AIzaSyAFcFTdKi4Py9lRw__NGjhfjwv925tVAUM"
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)