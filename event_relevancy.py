import json
from openai import OpenAI

client = OpenAI(api_key="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")
import os
from typing import List, Dict, Any

# Set your OpenAI API key from an environment variable

from pydantic import BaseModel
from openai import OpenAI


class Event(BaseModel):
    id: str
    relevance_score: int
    
    

class ListOfRelevantEvents(BaseModel):
    events: list[Event]

def load_events(country_codes: List[str]) -> List[Dict[str, Any]]:
    """
    Load events from JSON files corresponding to the provided country codes.
    """
    mapping = {
        "United States": "policy/us_bills.json",
        "United Kingdom": "policy/uk_bills.json",
        "Singapore": "policy/sg_bills.json",
        "India": "policy/india_bills.json"
    }
    events = []
    for code in country_codes:
        code_upper = code
        if code_upper in mapping:
            filename = mapping[code_upper]
            try:
                with open(filename, 'r') as f:
                    file_events = json.load(f)
                    # Optionally, filter events to ensure the region_codes list contains the code.
                    for event in file_events:
                        events.append(event)
            except Exception as e:
                print(f"Error loading file {filename}: {e}")
    return events

def batch_events(events: List[Dict[str, Any]], batch_size: int = 100) -> List[List[Dict[str, Any]]]:
    """
    Split the events list into batches of the specified size.
    """
    return [events[i:i + batch_size] for i in range(0, len(events), batch_size) if events[i]['body']]

def assess_events_relevancy_batch(events_batch: List[Dict[str, Any]], company_context: str, query: str) -> Dict[str, float]:
    """
    Takes a batch of events and uses a single API call to assess the relevancy for each.
    Returns a mapping from event_id to its relevance score.
    """
    # Build the prompt with summaries of each event.
    prompt = (
        "For each of the following events, evaluate its relevance to the company's strategic decision-making "
        "regarding expansion, particularly in the context of regulatory risk. Use the company context and query "
        "provided to determine a relevance score between 1 (not relevant) and 10 (extremely relevant). "
        "Return only valid JSON as an array of objects in the following format:\n"
        '[{"event_id": "E123", "relevance_score": 8.5}, ...]\n\n'
        f"Company Context: \"{company_context}\"\n"
        f"Query: \"{query}\"\n\n"
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
        response = client.beta.chat.completions.parse(model="gpt-4o",  # Replace with the correct model if needed
        messages=[
            {"role": "system", "content": "You are an expert in assessing regulatory risk relevance, accounting for straightforward regulatory and supply chain risks, as well as more hidden tail risks. You must assess the relevance of every event."},
            {"role": "user", "content": prompt}
        ], temperature=0, response_format=ListOfRelevantEvents)
        response_content = response.choices[0].message.content.strip()
        # Parse the response JSON
        scores_list = json.loads(response_content)
        # Build a mapping from event_id to relevance_score
        scores = {}
        for item in scores_list['events']:
            event_id = item['id']
            score = item['relevance_score']
            if event_id and isinstance(score, (int, float)):
                scores[event_id] = float(score)
        return scores
    except Exception as e:
        print(f"Error in batched relevancy assessment: {e}")
        # If an error occurs, return an empty mapping.
        return {}

def get_relevant_events(company_context: str, country_codes: List[str], query: str, max_events: int) -> Dict[str, Any]:
    """
    Returns a dictionary with:
      - "relevant_event_ids": an ordered list of event IDs (by relevancy),
      - "events": the full JSON objects for the top events.
    This function batches events to reduce the number of API calls.
    """
    events = load_events(country_codes)
    if not events:
        return {"relevant_event_ids": [], "events": []}

    # Batch events (you can adjust batch_size as needed)
    batches = batch_events(events, batch_size=100)
    # Create a mapping for all events' scores.
    all_scores = {}
    for batch in batches:
        batch_scores = assess_events_relevancy_batch(batch, company_context, query)
        print("Finished batch")
        all_scores.update(batch_scores)

    # Assign scores to events (default to 0 if not scored)
    for event in events:
        event_id = event.get("event_id", "")
        event["relevancy_score"] = all_scores.get(event_id, 0.0)

    # Sort events by score in descending order
    sorted_events = sorted(events, key=lambda x: x["relevancy_score"], reverse=True)
    selected_events = sorted_events[:max_events]
    result = {
        "relevant_event_ids": [e["id"] for e in selected_events],
        "events": selected_events
    }
    return result

if __name__ == "__main__":
    import json
    a = json.loads(open("company_site/arrow.json").read())
    relevant_events = get_relevant_events('Name: ' + a['name'] + '\n\nCompany Context: ' + a['summary'], a['location_list'], 'Arrow is expanding its IT distribution businesses and is concerned about any legal risks arising' , 10)