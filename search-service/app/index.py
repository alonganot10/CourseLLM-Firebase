from typing import List, Dict, Tuple
import bm25s
import Stemmer
from .models import DocumentChunk


class BM25Index:
    def __init__(self):
        self.docs: Dict[str, DocumentChunk] = {}
        self.doc_ids: List[str] = []
        self.bm25 = None
        self.stemmer = Stemmer.Stemmer("english")

    def upsert(self, doc: DocumentChunk):
        if doc.id not in self.docs:
            self.doc_ids.append(doc.id)
        self.docs[doc.id] = doc
        self._rebuild_index()

    def delete(self, doc_id: str):
        if doc_id in self.docs:
            del self.docs[doc_id]
            self.doc_ids.remove(doc_id)
            self._rebuild_index()

    def _rebuild_index(self):
        if not self.docs:
            self.bm25 = None
            return

        corpus = [self.docs[doc_id].content for doc_id in self.doc_ids]

        # Tokenize the corpus
        tokenized_corpus = bm25s.tokenize(
            corpus, stopwords="en", stemmer=self.stemmer
        )

        self.bm25 = bm25s.BM25()
        self.bm25.index(tokenized_corpus)

    def search(self, query: str, k: int = 10) -> List[Tuple[DocumentChunk, float]]:
        if not self.bm25:
            return []

        # Don't ask bm25s for more docs than we actually have
        num_docs = len(self.doc_ids)
        if num_docs == 0:
            return []

        k = min(k, num_docs)

        query_tokens = bm25s.tokenize(
            query,
            stopwords="en",
            stemmer=self.stemmer,
        )

        indices, scores = self.bm25.retrieve(query_tokens, k=k)

        results: List[Tuple[DocumentChunk, float]] = []
        for idx, score in zip(indices[0], scores[0]):
            doc_id = self.doc_ids[int(idx)]
            results.append((self.docs[doc_id], float(score)))

        return results

