from llama_index.core import Settings
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, StorageContext
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core.node_parser import SentenceWindowNodeParser
from llama_index.core.postprocessor import MetadataReplacementPostProcessor

import chromadb

import os

os.environ["OPENAI_API_KEY"] = (
    "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"
)


class LlamaIndexRetriever:
    def __init__(
        self,
        data_dir: str = "main_data",
        chroma_path: str = "rag/IRIS",
        collection_name: str = "quickstart",
    ):

        Settings.embed_model = OpenAIEmbedding()

        # Set up the persistent Chromadb client and collection
        client = chromadb.PersistentClient(path=chroma_path)
        chroma_collection = client.get_or_create_collection(collection_name)

        # Create the vector store and storage context
        vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
        self.storage_context = StorageContext.from_defaults(vector_store=vector_store)

        self.node_parser = SentenceWindowNodeParser.from_defaults(
                window_size=4,  # number of sentences around the embedded sentence to retrieve.
                window_metadata_key="window",
                original_text_metadata_key="original_text",
        )

        # Check if the index already exists in the persistent storage
        if len(chroma_collection.get()["ids"]) == 0:  # Check if collection is empty
            # Load and process documents only if collection is empty

            reader = SimpleDirectoryReader(input_dir=data_dir)
            documents = reader.load_data()
            # create the sentence window node parser w/ default settings


            nodes =self.node_parser.get_nodes_from_documents(documents)

            # Build the index from the documents with the text splitter transformation
            self.index = VectorStoreIndex(nodes, storage_context=self.storage_context, show_progress=True)
        else:
            # Load existing index from the vector store
            self.index = VectorStoreIndex.from_vector_store(
                vector_store, storage_context=self.storage_context
            )

        # Create a retriever from the index
        self.retriever = self.index.as_retriever(similarity_top_k=5)
        self.query_engine = self.index.as_query_engine(similarity_top_k=5)

    def retrieve_context(self, query: str):
        nodes = self.retriever.retrieve(query)
        results = []
        postprocessor = MetadataReplacementPostProcessor(target_metadata_key="window")
        large_nodes = postprocessor.postprocess_nodes(
            nodes
        )  # nodes with context window around them
        for node in large_nodes:
            results.append(node.text)
        return results
    
    def ask_question(self, query: str):
        response = self.query_engine.query(query)
        return response
    
    def add_data(self, directory: str):
        reader = SimpleDirectoryReader(input_dir=directory)
        documents = reader.load_data()
        nodes = self.node_parser.get_nodes_from_documents(documents)
        self.index.insert_nodes(nodes)

if __name__ == "__main__":

    obj = LlamaIndexRetriever()

    print(obj.ask_question("How did Storm Eowyn impact electricity trade between Britain and France?"))


