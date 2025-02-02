import io
import os
import time
import uuid
import json
import datetime
import requests
from bs4 import BeautifulSoup
import PyPDF2  # For extracting text from PDF files
import concurrent.futures

# Use the working cookies and headers from your curl snippet.
cookies = {
    '_ga': 'GA1.1.1702922776.1738459087',
    '_ga_CSLL4ZEK4L': 'GS1.1.1738459087.1.1.1738461469.0.0.0',
    '_ga_B59RVWNH5N': 'GS1.1.1738459086.1.1.1738461471.0.0.0',
}

headers = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'cache-control': 'max-age=0',
    # 'cookie': ... (we pass cookies via the cookies parameter)
    'dnt': '1',
    'if-none-match': '"1738461467"',
    'priority': 'u=0, i',
    'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
}

# Global base URL (used inside the page-processing function)
base_url = "https://www.ftc.gov/news-events/news/commission-actions"

def extract_pdf_text(doc_url):
    """Downloads the PDF from the given URL and extracts its text."""
    try:
        pdf_response = requests.get(doc_url, cookies=cookies, headers=headers)
        if pdf_response.status_code == 200:
            pdf_file = io.BytesIO(pdf_response.content)
            reader = PyPDF2.PdfReader(pdf_file)
            pdf_text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    pdf_text += page_text + "\n"
            return pdf_text.strip() if pdf_text.strip() else f"PDF available but no text extracted: {doc_url}"
        else:
            return f"Document available but failed to download: {doc_url}"
    except Exception as e:
        return f"Error extracting PDF text: {e}"

def process_page(page_num):
    """Processes a single FTC commission actions page and returns a list of action data."""
    local_actions = []
    params = {'page': str(page_num)}
    print(f"Scraping FTC page: {base_url}?page={page_num}")
    
    response = requests.get(
        base_url,
        params=params,
        cookies=cookies,
        headers=headers,
    )
    
    if response.status_code != 200:
        print(f"Failed to fetch page {page_num}. Status code: {response.status_code}")
        return local_actions

    soup = BeautifulSoup(response.text, 'html.parser')
    # Find commission action items using article tags with the specific class.
    articles = soup.find_all('article', class_='node--view-mode-search-result')
    
    if not articles:
        print(f"No article tags found on page {page_num}.")
        return local_actions
    print(f"Found {len(articles)} articles.")
    for article in articles:
        action_data = {}
        
        # Extract title, blurb, date, and link from the article.
        event_name_element = article.find('h3', class_='node-title')
        if not event_name_element:
            print("Skipping one article because it lacks a node-title.")
            continue
        blurb_element = article.find('div', class_='field--name-body')
        date_element = article.find('div', class_='field--name-field-date')
        link_element = event_name_element.find('a') if event_name_element else None

        action_data['event_name'] = event_name_element.text.strip() if event_name_element else "N/A"
        action_data['blurb'] = blurb_element.text.strip() if blurb_element else "N/A"

        # Extract and format the date.
        date_text = "N/A"
        if date_element:
            item = date_element.find(class_='field__item')
            if item:
                date_text = item.text.strip()
        try:
            action_data['date'] = (
                datetime.datetime.strptime(date_text, '%B %d, %Y').strftime('%Y-%m-%d')
                if date_text != "N/A" else "N/A"
            )
        except ValueError:
            action_data['date'] = date_text

        # Build the full detail URL.
        detail_url = "https://www.ftc.gov" + link_element['href'] if link_element else None
        body_text = ""
        if detail_url:
            detail_response = requests.get(detail_url, cookies=cookies, headers=headers)
            if detail_response.status_code == 200:
                detail_soup = BeautifulSoup(detail_response.text, 'html.parser')
                # Try to extract the regular body text.
                body_content = detail_soup.find('div', class_='field--name-body')
                if body_content and body_content.text.strip():
                    body_text = body_content.text.strip()
                else:
                    # If body text is empty, search for a PDF or DOCX link.
                    doc_link_tag = detail_soup.find('a', href=lambda x: x and (x.lower().endswith('.pdf') or x.lower().endswith('.docx')))
                    if doc_link_tag:
                        href = doc_link_tag.get('href')
                        if href.startswith('/'):
                            doc_url = "https://www.ftc.gov" + href
                        else:
                            doc_url = href
                        if doc_url.lower().endswith('.pdf'):
                            body_text = extract_pdf_text(doc_url)
                        elif doc_url.lower().endswith('.docx'):
                            # For DOCX extraction, you could implement extraction with python-docx.
                            body_text = f"DOCX extraction not implemented for {doc_url}"
            else:
                body_text = "Could not fetch full body"

        action_data['body'] = body_text
        action_data['region_codes'] = "US"
        action_data['metadata'] = {"detail_url": detail_url}
        action_data['id'] = str(uuid.uuid4())
        
        local_actions.append(action_data)
    return local_actions

def scrape_ftc_actions(num_pages=35, output_file="ftc_actions.json"):
    """
    Scrapes FTC commission actions from multiple pages concurrently and saves them to a JSON file.
    Uses <article> tags to split out individual actions. If no body text is found
    but a PDF (or DOCX) document is available, it extracts its text to populate the body field.
    """
    all_actions = []
    
    # Use a ThreadPoolExecutor to process pages concurrently.
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(process_page, page): page for page in range(num_pages)}
        for future in concurrent.futures.as_completed(futures):
            page_num = futures[future]
            try:
                page_actions = future.result()
                print(f"Page {page_num} processed, found {len(page_actions)} actions.")
                all_actions.extend(page_actions)
            except Exception as e:
                print(f"Error processing page {page_num}: {e}")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_actions, f, indent=4)
    print(f"FTC actions saved to {output_file}")

if __name__ == "__main__":
    # Adjust the number of pages as desired.
    scrape_ftc_actions(num_pages=35, output_file="ftc_actions.json")
