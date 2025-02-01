import requests
import json
import PyPDF2
from io import BytesIO
import difflib

API_BASE = "https://bills-api.parliament.uk/api/v1"

# Create a persistent session to hold cookies and headers
session = requests.Session()
session.headers.update({
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) '
        'Chrome/115.0.0.0 Safari/537.36'
    )
})

def get_bills_list(take=50, session_id=None, search_term=None):
    """
    Retrieves a list of bills. If session is provided, only bills from that session are returned.
    Optionally filters by a search term.
    """
    url = f"{API_BASE}/Bills?Take={take}"
    if session_id is not None:
        url += f"&Session={session_id}"
    if search_term is not None:
        # It is advisable to URL-encode the search term; for brevity we assume no special characters.
        url += f"&SearchTerm={search_term}"
    response = session.get(url)
    response.raise_for_status()
    return response.json()

def get_bill_details(billId):
    url = f"{API_BASE}/Bills/{billId}"
    response = session.get(url)
    response.raise_for_status()
    return response.json()

def get_bill_stages(billId):
    url = f"{API_BASE}/Bills/{billId}/Stages"
    response = session.get(url)
    response.raise_for_status()
    return response.json()

def get_bill_publications(billId):
    url = f"{API_BASE}/Bills/{billId}/Publications"
    response = session.get(url)
    response.raise_for_status()
    return response.json()

def download_pdf_text_from_url(pdf_url):
    """
    Downloads a PDF file from the given URL and extracts its text using PyPDF2.
    Additional headers are added to help mimic a real browser.
    """
    pdf_headers = {
        'Referer': 'https://www.parliament.uk/',
        'Origin': 'https://www.parliament.uk/',
        'Accept': 'application/pdf,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin'
    }
    response = session.get(pdf_url, headers=pdf_headers)
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

def extract_pdf_text_from_publications(billId):
    """
    For a given bill ID, looks through its publications (first in "files", then in "links")
    and returns the extracted PDF text (if any).
    """
    pdf_text = ""
    try:
        pub_result = get_bill_publications(billId)
        publications = pub_result.get("publications", [])
        for pub in publications:
            pdf_found = False
            # First try the "files" list
            for file in pub.get("files", []):
                filename = file.get("filename", "").lower()
                content_type = file.get("contentType", "").lower()
                if filename.endswith(".pdf") or "pdf" in content_type:
                    publicationId = pub.get("id")
                    documentId = file.get("id")
                    download_url = f"{API_BASE}/Publications/{publicationId}/Documents/{documentId}/Download"
                    pdf_text = download_pdf_text_from_url(download_url)
                    if pdf_text:
                        pdf_found = True
                        break
            if pdf_found:
                break
            # If not found in "files", try the "links" list.
            for link in pub.get("links", []):
                url_link = link.get("url", "")
                content_type = link.get("contentType", "").lower()
                if url_link.lower().endswith(".pdf") or "pdf" in content_type:
                    pdf_text = download_pdf_text_from_url(url_link)
                    if pdf_text:
                        pdf_found = True
                        break
            if pdf_found:
                break
    except Exception as e:
        print(f"Error getting publications for bill {billId}: {e}")
        pdf_text = ""
    return pdf_text

def is_close_enough(title1, title2, threshold=0.5):
    """
    Returns True if the two titles are similar enough.
    """
    ratio = difflib.SequenceMatcher(None, title1, title2).ratio()
    return ratio >= threshold

def main():
    # Hard-code the latest session (adjust as needed)
    latest_session = 39
    print(f"Latest session determined as: {latest_session}")

    try:
        bills_list = get_bills_list(take=5000, session_id=latest_session)
    except Exception as e:
        print(f"Error retrieving bills for session {latest_session}: {e}")
        return

    output_records = []
    
    for bill_summary in bills_list.get("items", []):
        billId = bill_summary.get("billId")
        print(f"\nProcessing Bill ID: {billId}")
        try:
            details = get_bill_details(billId)
        except Exception as e:
            print(f"Error getting details for bill {billId}: {e}")
            continue

        try:
            stages_result = get_bill_stages(billId)
            stages = stages_result.get("items", [])
        except Exception as e:
            print(f"Error getting stages for bill {billId}: {e}")
            stages = []

        # First attempt: try to get the PDF text from this bill's publications.
        pdf_text = extract_pdf_text_from_publications(billId)
        
        # Fallback: if pdf_text is empty, search by the bill's short title.
        if not pdf_text:
            original_title = details.get("shortTitle", "").strip()
            print(f"PDF text empty for Bill ID {billId} ('{original_title}'). Trying fallback search...")
            try:
                search_results = get_bills_list(search_term=original_title)
                fallback_found = False
                fallback_title = None
                for candidate in search_results.get("items", []):
                    candidate_title = candidate.get("shortTitle", "").strip()
                    if is_close_enough(original_title, candidate_title):
                        print(f"Candidate '{candidate_title}' is close enough to '{original_title}'.")
                        # Try to get PDF text for this candidate.
                        candidate_billId = candidate.get("billId")
                        candidate_pdf_text = extract_pdf_text_from_publications(candidate_billId)
                        if candidate_pdf_text:
                            fallback_found = True
                            fallback_title = candidate_title
                            pdf_text = candidate_pdf_text
                            print(f"Fallback candidate found: '{fallback_title}'")
                            break
                if not fallback_found:
                    print(f"No fallback candidate with a matching title produced PDF text for '{original_title}'.")
            except Exception as e:
                print(f"Fallback search error for bill '{original_title}': {e}")
                pdf_text = ""

        # Map fields to the desired output JSON schema.
        event_name = details.get("shortTitle", "")
        blurb = details.get("longTitle", "")
        body = pdf_text
        raw_date = details.get("lastUpdate", "")
        date = raw_date[:10] if raw_date and len(raw_date) >= 10 else ""
        region_codes = "GB"  # For UK bills.
        metadata = {
            "billId": billId,
            "introducedSessionId": details.get("introducedSessionId"),
            "isDefeated": details.get("isDefeated", False),
            "billTypeId": details.get("billTypeId"),
            "sponsors": details.get("sponsors", []),
            "currentStage": details.get("currentStage", {}),
            "allStages": stages,
            "raw_lastUpdate": raw_date
        }

        record = {
            "event_name": event_name,
            "blurb": blurb,
            "body": body,
            "date": date,
            "region_codes": region_codes,
            "metadata": metadata
        }
        output_records.append(record)

    with open("uk_bills.json", "w+", encoding="utf-8") as f:
        f.write(json.dumps(output_records, indent=4, ensure_ascii=False))

if __name__ == "__main__":
    main()
