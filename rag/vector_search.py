from llama_index.core import Settings
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, StorageContext
from llama_index.vector_stores.iris import IRISVectorStore  # New IRIS vector store import
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core.node_parser import SentenceWindowNodeParser
from llama_index.core.postprocessor import MetadataReplacementPostProcessor

import os

# Set your OpenAI API key
os.environ["OPENAI_API_KEY"] = (
    "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"
)

# IRIS connection parameters and instantiation of the vector store.
username = 'demo'
password = 'demo'
hostname = 'localhost'
port = '1972'
namespace = 'USER'
CONNECTION_STRING = f"iris://{username}:{password}@{hostname}:{port}/{namespace}"

# Note: The IRISVectorStore is instantiated later in the class below so that the
# index is built or loaded depending on whether data already exists.

class LlamaIndexRetriever:
    def __init__(self, data_dir: str = "main_data"):
        # Set the embedding model
        Settings.embed_model = OpenAIEmbedding()

        # Create the IRIS vector store instance
        vector_store = IRISVectorStore.from_params(
            connection_string=CONNECTION_STRING,
            table_name="policy_context",
            embed_dim=1536,  # OpenAI embedding dimension
        )

        # Create the storage context using the IRIS vector store
        self.storage_context = StorageContext.from_defaults(vector_store=vector_store)

        if len(vector_store.get()["ids"]) == 0:
            # No data present: load and process documents from the provided directory.
            reader = SimpleDirectoryReader(input_dir=data_dir)
            documents = reader.load_data()

            # Create a sentence-window node parser with default settings.
            self.node_parser = SentenceWindowNodeParser.from_defaults(
                window_size=3,  # Number of sentences around the embedded sentence.
                window_metadata_key="window",
                original_text_metadata_key="original_text",
            )

            nodes = self.node_parser.get_nodes_from_documents(documents)

            # Build the index from the processed nodes.
            self.index = VectorStoreIndex(
                nodes, storage_context=self.storage_context, show_progress=True
            )
        else:
            # Data exists: load the existing index from the IRIS vector store.
            self.index = VectorStoreIndex.from_vector_store(
                vector_store, storage_context=self.storage_context
            )

        # Create the retriever and query engine from the index.
        self.retriever = self.index.as_retriever(similarity_top_k=5)
        self.query_engine = self.index.as_query_engine(similarity_top_k=5)

    def retrieve_context(self, query: str):
        nodes = self.retriever.retrieve(query)
        results = []
        postprocessor = MetadataReplacementPostProcessor(target_metadata_key="window")
        # Enrich nodes with context window information.
        large_nodes = postprocessor.postprocess_nodes(nodes)
        for node in large_nodes:
            results.append(node.text)
        return results

    def ask_question(self, query: str):
        response = self.query_engine.query(query)
        return response

    def add_data(self, dir: str):
        reader = SimpleDirectoryReader(input_dir=dir)
        documents = reader.load_data()
        nodes = self.node_parser.get_nodes_from_documents(documents)
        self.index.insert(nodes)
