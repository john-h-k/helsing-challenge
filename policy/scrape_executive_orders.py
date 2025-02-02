import csv
import io
import json
import re
import time
import requests
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
    # Cookies are passed via the cookies parameter.
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

# Our desired output keys.
DESIRED_KEYS = {"title", "blurb", "date", "body", "region_codes", "metadata", "id"}

def extract_date_from_url(url):
    """
    Extracts a date in the format YYYY-MM-DD from a URL that contains a pattern like 'FR-YYYY-MM-DD'.
    Returns the date string if found, otherwise returns an empty string.
    """
    m = re.search(r"FR-(\d{4}-\d{2}-\d{2})", url)
    if m:
        return m.group(1)
    return ""

def extract_pdf_text(doc_url):
    """
    Downloads the PDF from the given URL and extracts its text.
    Returns the extracted text or an error message.
    """
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
            return f"Document available but failed to download: {doc_url} (Status {pdf_response.status_code})"
    except Exception as e:
        return f"Error extracting PDF text: {e}"

def process_order(row):
    """
    Processes a single CSV row (a dict).
    If a pdf_url is provided, extracts its text and inserts it into the 'body' field.
    Returns the updated row.
    """
    pdf_url = row.get("pdf_url", "").strip()
    if pdf_url:
        print(f"Extracting PDF text from {pdf_url}")
        row["body"] = extract_pdf_text(pdf_url)
        time.sleep(1)
    else:
        row["body"] = row.get("body", "")
    return row

def normalize_document(doc):
    """
    Converts the CSV row (a dict) into the desired output format:
      - 'title' is sourced from CSV 'event_name' (or 'title' if event_name is not present)
      - 'blurb' is always set to an empty string
      - 'date' is taken as is if available, otherwise extracted from pdf_url if possible
      - 'body' is taken as is
      - 'region_codes' is always set to "US"
      - 'id' is taken as is
    Any extra keys from the CSV are moved into the 'metadata' dictionary.
    """
    normalized = {}

    # Set title: Prefer "event_name", otherwise "title", else blank.
    if "event_name" in doc and doc["event_name"].strip():
        normalized["title"] = doc["event_name"].strip()
    elif "title" in doc and doc["title"].strip():
        normalized["title"] = doc["title"].strip()
    else:
        normalized["title"] = ""
    
    # Blurb is always blank.
    normalized["blurb"] = ""
    
    # Date: if present, use it; otherwise, attempt to extract from pdf_url.
    date = doc.get("date", "").strip()
    if not date and "pdf_url" in doc:
        extracted_date = extract_date_from_url(doc["pdf_url"])
        date = extracted_date if extracted_date else ""
    normalized["date"] = date
    
    # Body.
    normalized["body"] = doc.get("body", "").strip()
    
    # Region codes always "US".
    normalized["region_codes"] = "US"
    
    # ID.
    normalized["id"] = doc.get("id", "").strip()
    
    # Any extra fields go to metadata.
    metadata = {}
    for key, value in doc.items():
        if key in {"event_name", "title", "blurb", "date", "body", "region_codes", "id"}:
            continue
        metadata[key] = value
    normalized["metadata"] = metadata

    return normalized

def process_executive_orders(csv_file, json_output):
    """
    Reads executive orders from a CSV file,
    extracts text from PDFs (if applicable),
    normalizes each record into the desired output format,
    and writes the data to a JSON file.
    """
    orders = []
    with open(csv_file, newline='', encoding='utf-8') as f:
        # Try reading as comma-delimited first.
        reader = csv.DictReader(f)
        rows = list(reader)
        print("Initial fieldnames:", reader.fieldnames)
        
        # If only one field is found and it contains commas, re-read with comma as delimiter.
        if reader.fieldnames and len(reader.fieldnames) == 1 and "," in reader.fieldnames[0]:
            f.seek(0)
            reader = csv.DictReader(f, delimiter=",")
            rows = list(reader)
            print("Re-parsed fieldnames:", reader.fieldnames)
    
    # Process rows concurrently.
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        processed_rows = list(executor.map(process_order, rows))
    
    # Normalize each row.
    for row in processed_rows:
        normalized = normalize_document(row)
        orders.append(normalized)
    
    # Write the JSON output.
    with open(json_output, "w", encoding="utf-8") as f:
        json.dump(orders, f, indent=4)
    print(f"Executive orders saved to {json_output}")

if __name__ == "__main__":
    # Update the CSV file name as needed.
    process_executive_orders("policy/executive_orders.csv", "policy/executive_orders.json")
