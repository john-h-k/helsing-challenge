import json


def filter_bills(input_file, output_file):
    # Read the input JSON file
    with open(input_file, "r", encoding="utf-8") as f:
        bills = json.load(f)

    # Filter out items where body is empty
    filtered_bills = [bill for bill in bills if bill["body"]]

    # Write the filtered data to the output file
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(filtered_bills, f, indent=4)

    print(f"Original bill count: {len(bills)}")
    print(f"Filtered bill count: {len(filtered_bills)}")
    print(f"Removed {len(bills) - len(filtered_bills)} bills with empty bodies")


if __name__ == "__main__":
    filter_bills("india_bills.json", "india_bills_filtered.json")
