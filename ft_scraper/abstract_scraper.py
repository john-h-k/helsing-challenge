from typing import Optional, List
from abc import ABC, abstractmethod
from pydantic import BaseModel


class Article(BaseModel):
    uuid: int
    event_name: str
    blurb: str
    region_codes: str
    body: str
    date: str
    metadata: str


class ArticleMetadata(BaseModel):
    title: str
    url: str
    source: str


class Scraper(ABC):
    """
    Web Scraper abstract class
    """

    @abstractmethod
    def get_articles(self, company: str = "") -> List[ArticleMetadata]:
        """
        Scrapes article metadata (title, URL, date) from a given section/company.
        """
        pass

    @abstractmethod
    def get_article_data(self, url: str) -> Optional[Article]:
        """
        Extracts detailed information from an article URL, including content and metadata.
        """
        pass
