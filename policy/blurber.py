import json
import time
import re
from openai import OpenAI
import concurrent.futures

# Initialize your OpenAI client with the API key.
client = OpenAI(api_key="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")

def extract_date_from_url(url):
    """
    Extracts a date in the format YYYY-MM-DD from a URL that contains a pattern like 'FR-YYYY-MM-DD'.
    """
    m = re.search(r"FR-(\d{4}-\d{2}-\d{2})", url)
    return m.group(1) if m else ""

def generate_blurb(event):
    """
    Generate a revised, improved blurb for the given event using GPT-4.
    """
    # Create the prompt using the event data.
    prompt = (
        "Generate a concise and informative blurb for the given event. "
        "Make sure to mention any actionable or important details about the event as well as important takeaways. Keep it as a concise and direct summary and just as plain text. It should not exceed 75 tokens."
        "Keep it concise.\n\n"
        f"Title: {event.get('title', event.get('event_name', ''))}\n"
        f"Existing Blurb: {event.get('blurb', '')}\n"
        f"Body: {event.get('body', '')[:50000]}\n\n"
        "Now provide a revised, improved blurb:"
    )
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that writes very concise and informative summaries of legislative and policy events."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_completion_tokens=100
        )
        new_blurb = response.choices[0].message.content.strip()
        return new_blurb
    except Exception as e:
        print(f"Error generating blurb for event '{event.get('title', event.get('event_name', ''))}': {e}")
        return event.get("blurb", "")

def process_event(event):
    """
    Process an individual event:
      - Generate a new blurb using GPT-4.
      - (The event is assumed to be a dict already containing keys from the JSON file.)
    Additionally, if the event does not have a date but has a pdf_url in its metadata, try to extract the date.
    Also, ensure that:
       - The output uses 'title' instead of 'event_name'
       - 'blurb' is replaced by the generated blurb (or blank if GPT fails)
       - 'region_codes' is set to "US"
    Any extra keys are kept in 'metadata'.
    """
    # Set title: if there's an "event_name" use that; otherwise, if "title" exists, use it.
    title = event.get("event_name", "").strip() or event.get("title", "").strip()
    event["event_name"] = title

    # Override blurb with the generated new blurb.
    new_blurb = generate_blurb(event)
    event["blurb"] = new_blurb

    # For date: if not provided, and if pdf_url is available in metadata or event, extract it.
    date = event.get("date", "").strip()
    pdf_url = event.get("pdf_url", "").strip()
    if not date and pdf_url:
        extracted_date = extract_date_from_url(pdf_url)
        event["date"] = extracted_date

    # Set region_codes to "US"
    event["region_codes"] = "US"

    # Collect any extra keys into metadata. We'll assume the desired keys are: title, blurb, date, body, region_codes, id.
    desired = {"title", "blurb", "date", "body", "region_codes", "id"}
    extra = {k: v for k, v in event.items() if k not in desired}
    event["metadata"] = extra

    return event

def process_file(file_name):
    """
    Process a single JSON file. Loads events, processes them concurrently to update the blurb and other fields,
    and writes the updated list to a new JSON file with '_updated' appended to its name.
    """
    input_path = f"policy/{file_name}"
    output_path = f"policy/{file_name.split('.')[0]}_updated.json"

    with open(input_path, "r", encoding="utf-8") as f:
        events = json.load(f)

    print(f"Processing {len(events)} events from {file_name}...")
    updated_events = []
    # Use a thread pool to process events concurrently.
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(process_event, event): idx for idx, event in enumerate(events)}
        for future in concurrent.futures.as_completed(futures):
            try:
                updated_event = future.result()
                updated_events.append(updated_event)
            except Exception as e:
                print(f"Error processing an event: {e}")
            # Optional: a brief sleep between events if desired to manage rate limits.
            time.sleep(0.2)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(updated_events, f, indent=4, ensure_ascii=False)

    print(f"Updated events written to {output_path}")

def main():
    # List of JSON files in the "policy" directory.
    files = [
        "uk_bills.json",
        "sg_bills.json",
        "india_bills.json",
        "us_bills.json",
        "ftc_actions.json",
        "executive_orders.json"
    ]

    # Process each file concurrently (if desired) or sequentially.
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(files)) as executor:
        executor.map(process_file, files)

if __name__ == "__main__":
    main()
