import json
import time
from openai import OpenAI

client = OpenAI(api_key="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")

# Set your OpenAI API key

def generate_blurb(event):
    # Prepare a prompt that tells GPT-4 what you want.
    # You can adjust the prompt instructions as needed.
    prompt = (
        "Generate a concise and informative blurb for a legislative event. "
        "The blurb should mention the bill number, event name, key dates, and any other "
        "relevant details from the provided information. Use only a few sentences. "
        "\n\n"
        f"Event Name: {event['event_name']}\n"
        f"Bill Number: {event['metadata'].get('bill_no', 'N/A')}\n"
        f"Date Introduced: {event['metadata'].get('date_introduced', 'N/A')}\n"
        f"Existing Blurb: {event['blurb']}\n"
        f"Body (first 500 characters): {event['body'][:500]}\n\n"
        "Now provide a revised, improved blurb:"
    )

    # Call GPT-4 via the OpenAI ChatCompletion API
    try:
        response = client.chat.completions.create(model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a helpful assistant that writes concise and informative summaries of legislative events."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=150)
        new_blurb = response.choices[0].message.content.strip()
        return new_blurb
    except Exception as e:
        print(f"Error generating blurb for event '{event['event_name']}': {e}")
        return event["blurb"]  # Fallback to the old blurb if there is an error

def main():
    input_file = "policy/sg_bills.json"         # Your original JSON file
    output_file = "policy/sg_bills_updated.json"  # The output file with updated blurbs

    # Load the events from the JSON file
    with open(input_file, "r", encoding="utf-8") as f:
        events = json.load(f)

    # Iterate over each event and update its blurb
    for idx, event in enumerate(events):
        print(f"Processing event {idx + 1} / {len(events)}: {event['event_name']}")
        new_blurb = generate_blurb(event)
        event["blurb"] = new_blurb
        print("New blurb:", new_blurb)
        # (Optional) pause between requests to avoid rate limiting
        time.sleep(1)

    # Save the updated events back to a file (or overwrite the existing file)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(events, f, indent=4, ensure_ascii=False)
    print(f"Updated events written to {output_file}")

if __name__ == "__main__":
    main()
