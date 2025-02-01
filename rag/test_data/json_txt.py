import json


def json_to_txt(input_json_path, output_txt_path):
    """
    Convert JSON file to text file, separating each item's body with double newlines.

    Args:
        input_json_path (str): Path to input JSON file
        output_txt_path (str): Path to output text file
    """
    try:
        # Read JSON file
        with open(input_json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Extract bodies and join with double newlines
        if isinstance(data, list):
            bodies = [item.get("body", "") for item in data if isinstance(item, dict)]
        elif isinstance(data, dict):
            bodies = [data.get("body", "")]
        else:
            raise ValueError("Input JSON must be a list of objects or a single object")

        text_content = "\n\n\n\n".join(filter(None, bodies))

        # Write to text file
        with open(output_txt_path, "w", encoding="utf-8") as f:
            f.write(text_content)

    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {e}")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":

    json_to_txt("india_bills_filtered.json", "india_bills_filtered.txt")
