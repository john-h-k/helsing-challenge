import json
import requests
from io import BytesIO
from pdfminer.high_level import extract_text

# URL of the API endpoint for bills (requesting 1000 records per page)
BILLS_API_URL = (
    "https://sansad.in/api_rs/legislation/getBills?"
    "loksabha=&sessionNo=&billName=&house=&ministryName=&billType=&billCategory=&billStatus="
    "&introductionDateFrom=&introductionDateTo=&passedInLsDateFrom=&passedInLsDateTo="
    "&passedInRsDateFrom=&passedInRsDateTo=&page=1&size=1000&locale=en&sortOn=billIntroducedDate&sortBy=desc"
)

# Common headers to mimic a browser request
COMMON_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/115.0.0.0 Safari/537.36"
    ),
    "Referer": "https://sansad.in/"
}


def fetch_bills():
    """
    Fetch the bills JSON data from the API.
    """
    response = requests.get(BILLS_API_URL, headers=COMMON_HEADERS)
    if response.status_code != 200:
        print("Failed to get bill data. Status code:", response.status_code)
        return None
    return response.json()


def extract_pdf_text(pdf_url, headers):
    """
    Download a PDF from pdf_url and extract its text using pdfminer.six.
    """
    try:
        response = requests.get(pdf_url, headers=headers)
        if response.status_code != 200:
            print(f"Failed to download PDF from {pdf_url}. Status code: {response.status_code}")
            return ""
        pdf_stream = BytesIO(response.content)
        # extract_text returns the complete text of the PDF
        text = extract_text(pdf_stream)
        return text
    except Exception as e:
        print(f"Error extracting PDF text from {pdf_url}: {e}")
        return ""


def process_bill(record):
    """
    Process a single bill record into the desired output format.
    """
    # Attempt to extract text from the introduced file PDF if available
    introduced_file = record.get("billIntroducedFile", "")
    pdf_text = ""
    if introduced_file:
        print(f"Processing PDF for bill {record.get('billNumber')}: {introduced_file}")
        pdf_text = extract_pdf_text(introduced_file, COMMON_HEADERS)

    event_name = record.get("billName", "")
    blurb = pdf_text[:500] if pdf_text else ""
    body = pdf_text
    date = record.get("billIntroducedDate", "")
    region_codes = []  # No region codes provided; output empty list.

    # Prepare metadata with relevant information
    metadata = {
        "bill_number": record.get("billNumber", ""),
        "bill_year": record.get("billYear", ""),
        "bill_type": record.get("billType", ""),
        "bill_category": record.get("billCategory", ""),
        "ministry_name": record.get("ministryName", ""),
        "introduced_in_house": record.get("billIntroducedInHouse", ""),
        "introduced_date": record.get("billIntroducedDate", ""),
        "bill_passed_in_ls_date": record.get("billPassedInLSDate", ""),
        "bill_passed_in_rs_date": record.get("billPassedInRSDate", ""),
        "bill_assented_date": record.get("billAssentedDate", ""),
        "status": record.get("status", ""),
        "files": {
            "billIntroducedFile": record.get("billIntroducedFile", ""),
            "billPassedInLSFile": record.get("billPassedInLSFile", ""),
            "billPassedInRSFile": record.get("billPassedInRSFile", ""),
            "billPassedInBothHousesFile": record.get("billPassedInBothHousesFile", ""),
            "errataFile": record.get("errataFile", ""),
            "reportFile": record.get("reportFile", ""),
            "billGazettedFile": record.get("billGazettedFile", ""),
            "billSynopsisFile": record.get("billSynopsisFile", "")
        }
    }

    return {
        "event_name": event_name,
        "blurb": blurb,
        "body": body,
        "date": date,
        "region_codes": region_codes,
        "metadata": metadata
    }


def main():
    data = fetch_bills()
    if data is None:
        return

    records = data.get("records", [])
    if not records:
        print("No bill records found.")
        return

    output = []
    print(f"Fetched {len(records)} records. Processing bills from 2024 and onward...\n")
    for record in records:
        # Only process bills with a billYear of 2024 or greater
        if record.get("billYear", 0) < 2024:
            continue

        processed_bill = process_bill(record)
        output.append(processed_bill)
        print("-" * 80)

    # Output the resulting list as formatted JSON
    output_json = json.dumps(output, indent=4)
    print(output_json)
    
    with open("india_bills.json", "w+") as f:
        f.write(output_json)


if __name__ == "__main__":
    main()
