import requests
from bs4 import BeautifulSoup
import json
import re
from datetime import datetime
import PyPDF2
from io import BytesIO

# Define headers to mimic a real browser and provide a referer.
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/115.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.parliament.gov.sg/",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# --- helper function to reformat a date string from "dd.mm.yyyy" to "yyyy-mm-dd" ---
def reformat_date(date_str):
    try:
        dt = datetime.strptime(date_str.strip(), "%d.%m.%Y")
        return dt.strftime("%Y-%m-%d")
    except Exception as e:
        return date_str.strip()

# --- helper function to download and extract text from a PDF ---
def download_pdf_text(pdf_url):
    response = requests.get(pdf_url, headers=HEADERS)
    response.raise_for_status()
    pdf_file = BytesIO(response.content)
    try:
        reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip()
    except Exception as e:
        print(f"Error extracting PDF text from {pdf_url}: {e}")
        return ""

# --- function to scrape one page (given the page number) ---
def scrape_page(page_number):
    url = f"https://www.parliament.gov.sg/parliamentary-business/bills-introduced?page={page_number}"
    print(f"Scraping page: {url}")
    response = requests.get(url, headers=HEADERS)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    bill_divs = soup.find_all("div", class_="indv-bill")
    records = []
    
    for bill_div in bill_divs:
        try:
            # --- extract the title and PDF URL from the "bill-title" row ---
            title_div = bill_div.find("div", class_=re.compile("bill-title"))
            if title_div:
                a_tag = title_div.find("a")
                if a_tag:
                    raw_title = a_tag.get_text(strip=True)
                    pdf_url = a_tag.get("href")
                    # remove trailing "(PDF, ...)" from the title if present
                    title = re.sub(r"\s*\(PDF.*?\)$", "", raw_title)
                else:
                    raw_title = ""
                    pdf_url = ""
                    title = ""
            else:
                raw_title = ""
                pdf_url = ""
                title = ""
            
            # --- extract the bill number from the second column of the title row ---
            bill_no_div = title_div.find("div", class_=re.compile("col-md-4"))
            if bill_no_div:
                bill_no_text = bill_no_div.get_text(strip=True)
                bill_no = bill_no_text.replace("Bill No:", "").strip()
            else:
                bill_no = ""
            
            # --- extract the bill “info” (dates) from the subsequent row ---
            info_divs = bill_div.find_all("div", class_="col-md-4 col-xs-12 xs-boxgap")
            date_introduced = ""
            date_2nd_reading = ""
            date_passed = ""
            if len(info_divs) >= 1:
                # text format: "Date Introduced: <br> 07.01.2025"
                date_introduced = info_divs[0].get_text(separator=" ", strip=True).replace("Date Introduced:", "").strip()
            if len(info_divs) >= 2:
                date_2nd_reading = info_divs[1].get_text(separator=" ", strip=True).replace("Date of 2nd Reading:", "").strip()
            if len(info_divs) >= 3:
                date_passed = info_divs[2].get_text(separator=" ", strip=True).replace("Date Passed:", "").strip()
            
            # reformat the introduced date if it matches dd.mm.yyyy
            date_iso = reformat_date(date_introduced) if re.match(r"\d{2}\.\d{2}\.\d{4}", date_introduced) else date_introduced
            
            # --- attempt to download and extract the full text from the PDF ---
            body_text = ""
            if pdf_url:
                try:
                    body_text = download_pdf_text(pdf_url)
                except Exception as e:
                    print(f"Error downloading PDF text for bill {bill_no}: {e}")
                    body_text = ""
            
            # --- prepare a blurb summarising the bill info ---
            blurb = f"Bill No: {bill_no}. Date Introduced: {date_introduced}. Date of 2nd Reading: {date_2nd_reading}. Date Passed: {date_passed}."
            
            record = {
                "event_name": title,
                "blurb": blurb,
                "body": body_text,
                "date": date_iso,
                "region_codes": "SG",
                "metadata": {
                    "bill_no": bill_no,
                    "raw_title": raw_title,
                    "pdf_url": pdf_url,
                    "date_introduced": date_introduced,
                    "date_2nd_reading": date_2nd_reading,
                    "date_passed": date_passed,
                    "page": page_number
                }
            }
            records.append(record)
            print(f"Scraped bill: {bill_no} - {title}")
        except Exception as e:
            print(f"Error processing a bill: {e}")
            continue
    
    return records

# --- main function to scrape the first 5 pages and output JSON ---
def main():
    all_records = []
    for page in range(1, 6):  # first 5 pages
        try:
            page_records = scrape_page(page)
            all_records.extend(page_records)
        except Exception as e:
            print(f"Error scraping page {page}: {e}")
            continue
    
    output_file = "sg_bills.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(all_records, f, indent=4, ensure_ascii=False)
    print(f"Saved {len(all_records)} records to {output_file}")

if __name__ == "__main__":
    main()
