from llama_index.core import (
    Settings,
    VectorStoreIndex,
    SimpleDirectoryReader,
    StorageContext,
)
from llama_index.core.text_splitter import TokenTextSplitter
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.llms.gemini import Gemini
from llama_index.embeddings.openai import OpenAIEmbedding
import chromadb

import os


class LlamaIndexRetriever:
    def __init__(
        self,
        data_dir: str = "data",
        chroma_path: str = "IRIS",
        collection_name: str = "quickstart",
    ):
        # Configure the LLM and embeddings
        Settings.llm = Gemini(
            model="models/gemini-2.0-flash-exp",
            api_key="AIzaSyAOZ3G2d0Og75yNLADQU0TTTE4syvhH1hw",
        )
        Settings.embed_model = OpenAIEmbedding(
            api_key="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"
        )

        # Set up the persistent Chromadb client and collection
        client = chromadb.PersistentClient(path=chroma_path)
        chroma_collection = client.get_or_create_collection(collection_name)

        # Create the vector store and storage context
        vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
        self.storage_context = StorageContext.from_defaults(vector_store=vector_store)

        if not os.path.exists("IRIS"):
            # Load documents from the specified directory
            reader = SimpleDirectoryReader(input_dir=data_dir)
            documents = reader.load_data()

            # Create a text splitter to divide documents into smaller chunks
            text_splitter = TokenTextSplitter(chunk_size=100)

            # Build the index from the documents with the text splitter transformation
            self.index = VectorStoreIndex.from_documents(
                documents,
                storage_context=self.storage_context,
                transformations=[text_splitter],
                # show_progress=True
            )
        else:
            self.index = VectorStoreIndex.from_vector_store(
                vector_store, storage_context=self.storage_context
            )
        # Create a retriever from the index with a similarity search configuration
        self.q_engine = self.index.as_retriever(similarity_top_k=5)

    def retrieve_context(self, query: str):
        """
        Given a query string, retrieves the top matching nodes from the index.

        Args:
            query (str): The query string to search for.

        Returns:
            list: A list of dictionaries containing 'score' and 'text' for each node.
        """
        nodes = self.q_engine.retrieve(query)
        results = []
        for node in nodes:
            results.append({"score": node.score, "text": node.text})
        return results
