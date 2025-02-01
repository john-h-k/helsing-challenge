import requests
from bs4 import BeautifulSoup

from typing import Optional, List
import logging
import json
import os
from dotenv import load_dotenv

from abstract_scraper import Scraper, ArticleMetadata, Article

load_dotenv()


class FTScraper(Scraper):
    """
    A web scraper for extracting articles and content from the Financial Times website.
    """

    def __init__(self):
        self.base_url = "https://www.ft.com"
        self.search_url = "https://www.ft.com/search?q="
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/91.0.4472.124 Safari/537.36"
            )
        }
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

    def get_articles(self, company: str = "") -> List[ArticleMetadata]:
        """
        Scrapes article metadata (title, URL, date) from a given FT section.
        """
        try:
            section = self._get_company_page(company)
            url = f"{self.base_url}{section}"
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")
            articles = []

            headlines = soup.find_all("a", {"data-trackable": "heading-link"})

            for headline in headlines:
                try:
                    title = headline.get_text().strip()
                    link = headline.get("href")
                    if link and not link.startswith("http"):
                        link = self.base_url + link

                    # Get timestamp if available (might be in a nearby element)
                    timestamp_elem = headline.find_parent().find_parent().find("time")
                    pub_date = (
                        timestamp_elem.get("datetime") if timestamp_elem else None
                    )

                    if title:
                        articles.append(
                            ArticleMetadata(
                                title=title,
                                url=link,
                                # published_date=pub_date,
                                source="Financial Times",
                            )
                        )
                except Exception as e:
                    self.logger.error(f"Error parsing headline: {str(e)}")
                    continue

            self.logger.info(f"Found {len(articles)} articles")
            return articles

        except requests.exceptions.RequestException as e:
            self.logger.error(f"Error fetching FT content: {str(e)}")
            return []

    def get_article_data(self, url: str) -> Optional[Article]:
        """
        Extracts detailed information from an article URL, including content and metadata.
        """

        try:
            cookies = {"FTSession_s": os.getenv("FT_SESSION_COOKIE")}

            response = requests.get(url, headers=self.headers, cookies=cookies)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            script_tag = soup.find("script", {"type": "application/ld+json"})
            if script_tag and "articleBody" in script_tag.string:

                article_data = json.loads(script_tag.string)

                article_info = Article(
                    title=article_data.get("headline"),
                    description=article_data.get("description"),
                    # "author": article_data.get("author", [{}])[0].get("name"),
                    author=(
                        article_data.get("author", [{}])[0].get("name")
                        if article_data["author"]
                        else "not found"  # TODO: think about this
                    ),
                    published_date=article_data.get("datePublished"),
                    content=article_data.get("articleBody"),
                    url=url,
                    main_image_url=article_data.get("image", {}).get("url"),
                    source="Financial Times",
                    # 'modified_date': article_data.get('dateModified'),
                    # 'word_count': article_data.get('wordCount'),
                )

                return article_info
            else:
                self.logger.error("Could not find article content. Might need auth.")
                return None

        except requests.exceptions.RequestException as e:
            self.logger.error(f"Error fetching article content: {str(e)}")
            return None

    def _get_company_page(self, company: str) -> Optional[str]:
        """
        Searches FT for a company's section and returns its URL endpoint.
        """

        try:
            space_encoded = company.replace(" ", "%20")
            search_url = f"{self.search_url}{space_encoded}"
            response = requests.get(search_url)

            soup = BeautifulSoup(response.text, "html.parser")
            related = soup.find("ul", attrs={"class": "link-list"})
            top_link = related.find("li").find("a")
            endpoint = top_link["href"]
            return endpoint

        except Exception as e:
            self.logger.error(
                f"Can't get company page: {str(e)}"
            )  # TODO: fallback to some sane default


if __name__ == "__main__":
    scraper = FTScraper()

    COMPANY = "apple"

    articles = scraper.get_articles(company=COMPANY)  # are chronological

    article_contents = []
    seen = set()
    for article in articles:
        if article and article.url not in seen:
            seen.add(article.url)
            content = scraper.get_article_data(article.url)
            if content:
                article_contents.append(content.model_dump())
        else:
            scraper.logger.info("skipping duplicate")

    outfile = "out_ft2.txt"

    with open(outfile, "w") as f:
        json.dump(article_contents, f, indent=2)
