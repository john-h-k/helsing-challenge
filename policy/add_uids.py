import json
import uuid
import os

# List of JSON filenames (adjust paths if needed)
json_files = [
    "policy/sg_bills.json",
    "policy/us_bills.json",
    "policy/uk_bills.json",
    "policy/india_bills.json"
]

def add_short_ids_to_events(filename):
    if not os.path.exists(filename):
        print(f"File not found: {filename}")
        return

    # Load the JSON data
    with open(filename, "r", encoding="utf-8") as f:
        try:
            events = json.load(f)
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON in {filename}: {e}")
            return

    # Add a unique short id (using the first 8 characters of a UUID4)
    for event in events:
        # You can adjust the substring length as needed
        event["id"] = uuid.uuid4().hex[:8]

    # Write the updated events back to the same file (or use a new filename if preferred)
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(events, f, indent=4, ensure_ascii=False)
    print(f"Updated {filename} with short unique ids for each event.")

def main():
    for file in json_files:
        add_short_ids_to_events(file)

if __name__ == "__main__":
    main()
