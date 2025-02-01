from typing import Optional, List
from abc import ABC, abstractmethod
from pydantic import BaseModel


class Article(BaseModel):
    title: str
    description: str
    author: str
    published_date: str
    content: str
    url: str
    main_image_url: Optional[str]
    source: str


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
