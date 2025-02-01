import requests
import json
import PyPDF2
from io import BytesIO
from bs4 import BeautifulSoup

# --- Configuration ---
API_KEY = "KuJC5YJoWyawU5egTAFzXFT7M3zcGldRTgGeJzZ9"
BASE_URL = "https://api.congress.gov/v3"
HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/115.0.0.0 Safari/537.36'
    )
}

# --- Helper functions ---

def get_current_congress():
    """Retrieves the current congress number from /congress/current."""
    url = f"{BASE_URL}/congress/current?api_key={API_KEY}"
    response = requests.get(url, headers=HEADERS)
    response.raise_for_status()
    data = response.json()
    # Expecting data like: { "congress": { "number": 118, ... } }
    current_congress = data.get("congress", {}).get("number")
    if not current_congress:
        raise Exception("Could not determine the current congress")
    print(f"Current congress: {current_congress}")
    return current_congress

def get_bills_list(congress, limit=100, offset=0):
    """
    Retrieves a list of bills for the given congress.
    Endpoint: GET /bill/{congress}?limit=&offset=
    """
    url = f"{BASE_URL}/bill/{congress}?api_key={API_KEY}&limit={limit}&offset={offset}"
    response = requests.get(url, headers=HEADERS)
    response.raise_for_status()
    return response.json()  # Expected to include "bills" and "pagination"

def get_bill_text(congress, bill_type, bill_number):
    """
    Retrieves the text versions for a specified bill.
    Endpoint: GET /bill/{congress}/{bill_type}/{bill_number}/text
    """
    url = f"{BASE_URL}/bill/{congress}/{bill_type}/{bill_number}/text?api_key={API_KEY}"
    response = requests.get(url, headers=HEADERS)
    response.raise_for_status()
    return response.json()

def download_pdf_text(pdf_url):
    """
    Downloads a PDF from the provided URL and extracts its text using PyPDF2.
    """
    pdf_headers = {
        'User-Agent': HEADERS['User-Agent'],
        'Referer': 'https://www.congress.gov/'
    }
    response = requests.get(pdf_url, headers=pdf_headers)
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

def download_html_text(html_url):
    """
    Downloads the HTML version from the provided URL and returns its raw text.
    """
    response = requests.get(html_url, headers=HEADERS)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    return soup.get_text(separator="\n").strip()

# --- Main script ---

def main():
    try:
        current_congress = get_current_congress()
    except Exception as e:
        print(f"Error retrieving current congress: {e}")
        return

    # Retrieve bills for the current congress using pagination
    offset = 0
    limit = 1000
    all_bills = []
    while True:
        try:
            bills_data = get_bills_list(current_congress, limit=limit, offset=offset)
        except Exception as e:
            print(f"Error retrieving bills at offset {offset}: {e}")
            break
        bills = bills_data.get("bills", [])
        if not bills:
            break
        all_bills.extend(bills)
        # Use pagination info if available
        pagination = bills_data.get("pagination", {})
        total = pagination.get("count", 0)
        offset += limit
        if offset >= total:
            break

    print(f"Total bills retrieved: {len(all_bills)}")

    output_records = []
    for bill in all_bills:
        try:
            # Each bill object is expected to have keys such as:
            # "congress", "number", "type", "title", "latestAction", "originChamber", etc.
            bill_congress = bill.get("congress")
            bill_number = bill.get("number")
            bill_type = bill.get("type").lower()  # e.g., "HR", "S", etc.
            title = bill.get("title", "").strip()
            latest_action = bill.get("latestAction", {})
            action_date = latest_action.get("actionDate", "").strip()  # Expecting "YYYY-MM-DD"
            action_text = latest_action.get("text", "").strip()

            # Try to retrieve the bill text from the /text endpoint
            bill_text = ""
            try:
                text_data = get_bill_text(bill_congress, bill_type, bill_number)
                text_versions = text_data.get("textVersions", [])
                import IPython; IPython.embed()
                
                if text_versions:
                    # Prefer a PDF version if available; otherwise try "Formatted Text"
                    pdf_url = None
                    html_url = None
                    for version in text_versions:
                        formats = version.get("formats", [])
                        for fmt in formats:
                            fmt_type = fmt.get("type", "")
                            url = fmt.get("url", "")
                            if "PDF" in fmt_type:
                                pdf_url = url
                                break
                            elif "Formatted Text" in fmt_type:
                                html_url = url
                        if pdf_url:
                            break
                    if pdf_url:
                        bill_text = download_pdf_text(pdf_url)
                    elif html_url:
                        bill_text = download_html_text(html_url)
            except Exception as e:
                print(f"Error retrieving text for bill {bill_number}: {e}")
                bill_text = ""

            # Build the output record (mapping to the desired schema)
            record = {
                "event_name": title,
                "blurb": action_text,
                "body": bill_text,
                "date": action_date,
                "region_codes": "US",
                "metadata": {
                    "bill_number": bill_number,
                    "bill_type": bill_type,
                    "congress": bill_congress,
                    "originChamber": bill.get("originChamber", ""),
                    "originChamberCode": bill.get("originChamberCode", ""),
                    "updateDate": bill.get("updateDate", ""),
                    "updateDateIncludingText": bill.get("updateDateIncludingText", ""),
                    "url": bill.get("url", "")
                }
            }
            output_records.append(record)
            print(f"Processed bill {bill_number}: {title}")
        except Exception as e:
            print(f"Error processing a bill: {e}")
            continue

    # Write the final JSON file
    output_filename = "us_billsz.json"
    with open(output_filename, "w", encoding="utf-8") as f:
        json.dump(output_records, f, indent=4, ensure_ascii=False)
    print(f"Output written to {output_filename}")

if __name__ == "__main__":
    main()
