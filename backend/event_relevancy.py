import json
import os
from concurrent.futures import ThreadPoolExecutor
import concurrent.futures
from typing import List, Dict, Any
from enum import IntEnum

from pydantic import BaseModel
from openai import OpenAI

# Initialize the OpenAI client
client = OpenAI(
    api_key="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"
)


# Define the Score enum.
class Score(IntEnum):
    not_relevant = 0
    somewhat_relevant = 1
    relevant = 2
    very_relevant = 3


# Mapping from the string score (returned by the API) to our Score enum.
score_mapping = {
    "not relevant": Score.not_relevant,
    "somewhat relevant": Score.somewhat_relevant,
    "relevant": Score.relevant,
    "very relevant": Score.very_relevant,
}


def score_to_string(score: Score) -> str:
    """
    Converts a numeric Score to its string representation.
    """
    for key, val in score_mapping.items():
        if val == score:
            return key
    return "not relevant"


# Pydantic models for the response expected from the OpenAI API.
class Event(BaseModel):
    id: str
    relevancy_justification: str
    relevance_score: str


# Because the LLM is instructed to return a JSON array (not an object with a key),
# we define a pydantic model with an attribute "events" to represent a list of Event.
class ListOfRelevantEvents(BaseModel):
    events: List[Event]


def load_events(country_codes: List[str]) -> List[Dict[str, Any]]:
    """
    Load events from JSON files corresponding to the provided country codes.
    """
    mapping = {
        "United States": "../policy/us_bills.json",
        "United Kingdom": "../policy/uk_bills.json",
        "Singapore": "../policy/sg_bills.json",
        "India": "../policy/india_bills.json",
    }
    events = []
    for code in country_codes:
        if code in mapping:
            filename = mapping[code]
            try:
                with open(filename, "r") as f:
                    file_events = json.load(f)
                    for event in file_events:
                        events.append(event)
            except Exception as e:
                print(f"Error loading file {filename}: {e}")
    return events


def batch_events(
    events: List[Dict[str, Any]], batch_size: int = 100
) -> List[List[Dict[str, Any]]]:
    """
    Split the events list into batches of the specified size.
    Only include events that have a "body" field.
    """
    valid_events = [event for event in events if event.get("body")]
    return [
        valid_events[i : i + batch_size]
        for i in range(0, len(valid_events), batch_size)
    ]


def assess_events_relevancy_batch(
    events_batch: List[Dict[str, Any]], company_context: str, query: str
) -> Dict[str, Score]:
    """
    Takes a batch of events and uses a single API call to assess their relevancy.
    Returns a mapping from event id to its numeric Score.
    """
    prompt = (
        "For each of the following events, evaluate its relevance to the company's strategic decision-making "
        "particularly in the context of regulatory risk. Use the company context and query "
        "provided to determine a relevance score as one of the following strings: 'not relevant', 'somewhat relevant', "
        "'relevant', or 'very relevant'.\n"
        "Return only valid JSON as an array of objects in the following format:\n"
        '[{"id": "E123", "relevancy_justification": "concise description of why this is relevant or not" "relevance_score": "relevant"}, ...]\n\n'
        f'Company Context: "{company_context}"\n'
        f'Company Query: "{query}"\n\n'
        "Events:\n"
    )
    # Enumerate each event in the batch with its key details.
    for idx, event in enumerate(events_batch, start=1):
        prompt += (
            f"{idx}. Event ID: {event.get('id', '')}\n"
            f"   Event Name: {event.get('event_name', '')}\n"
            f"   Blurb: {event.get('blurb', '')}\n"
            f"   Date: {event.get('date', '')}\n\n"
        )

    try:
        response = client.beta.chat.completions.parse(
            model="gpt-4o",  # Replace with the correct model if needed
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert in assessing regulatory risk relevance, accounting for straightforward regulatory "
                        "and supply chain risks, as well as more hidden tail risks. You must assess the relevance of every event."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0,
            response_format=ListOfRelevantEvents,
        )
        # Get the raw text from the message content and then parse it using our Pydantic model.
        raw_content = response.choices[0].message.content.strip()
        parsed_response = ListOfRelevantEvents.parse_raw(raw_content)
        scores = {}
        for item in parsed_response.events:
            event_id = item.id
            score_str = item.relevance_score.strip().lower()
            justification = item.relevancy_justification.strip()
            numeric_score = score_mapping.get(score_str, Score.not_relevant)
            scores[event_id] = (numeric_score, justification)
        return scores
    except Exception as e:
        print(f"Error in batched relevancy assessment: {e}")
        return {}


def get_relevant_events(
    company_context: str, country_codes: List[str], query: str, max_events: int
) -> Dict[str, Any]:
    """
    Returns a dictionary with:
      - "relevant_event_ids": an ordered list of event IDs (by descending relevancy),
      - "events": the full JSON objects for the top events.
    """
    events = load_events(country_codes)
    if not events:
        return {"relevant_event_ids": [], "events": []}

    batches = batch_events(events, batch_size=50)
    all_scores = {}

    with ThreadPoolExecutor() as executor:
        futures = []
        for batch in batches:
            futures.append(
                executor.submit(
                    lambda: assess_events_relevancy_batch(batch, company_context, query)
                )
            )
        for future in concurrent.futures.as_completed(futures):
            batch_scores = future.result()
            all_scores.update(batch_scores)

    # Attach the numeric score to each event.
    for event in events:
        event_id = event.get("id", "")
        numeric_score, justification = all_scores.get(
            event_id, (Score.not_relevant, None)
        )
        event["numeric_score"] = numeric_score
        event["justification"] = justification

    # Sort events by the numeric score in descending order.
    sorted_events = sorted(events, key=lambda x: x["numeric_score"], reverse=True)
    selected_events = sorted_events[:max_events]

    # Convert numeric scores back into string values for output.
    for event in selected_events:
        numeric_score = event.pop("numeric_score")
        event["relevancy_score"] = score_to_string(numeric_score)

    result = {
        "relevant_event_ids": [e["id"] for e in selected_events],
        "events": selected_events,
    }
    return result


if __name__ == "__main__":
    # Example test using a local JSON file for company context.
    a = json.loads(open("../company_site/arrow.json").read())
    relevant_events = get_relevant_events(
        "Name: " + a["name"] + "\n\nCompany Context: " + a["summary"],
        a["location_list"],
        "Arrow is expanding its IT distribution businesses and is concerned about any legal risks arising",
        10,
    )
    print(json.dumps(relevant_events, indent=2))
