# TODO SUHAS: maybe sample diversity of events for most relevant surfacing, maybe do prediction market integration if mcdonald hasnt, add infra surfacing
import json
import os
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import concurrent.futures
from typing import List, Dict, Any
from enum import IntEnum

from pydantic import BaseModel
from openai import OpenAI
from enum import Enum
from geopy.distance import geodesic

import geopy

import geopandas as gpd

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


class ObjectType(Enum):
    military = 0
    economic = 1
    political = 2
    infrastructure = 3
    facility = 4


class Status(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    UNKNOWN = "unknown"


class GeoObject(BaseModel):
    id: str
    name: str
    type: ObjectType
    description: str
    latitude: float
    longitude: float
    countries: list[str]
    status: Status


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
    possibility: bool
    relevance_score: str
    location: str
    lat: float
    lon: float


# Because the LLM is instructed to return a JSON array (not an object with a key),
# we define a pydantic model with an attribute "events" to represent a list of Event.
class ListOfRelevantEvents(BaseModel):
    events: List[Event]


def load_events(country_codes: List[str]) -> List[Dict[str, Any]]:
    """
    Load events from JSON files corresponding to the provided country codes.
    """
    mapping = {
        "MAGIC": [("policy/magic.json", "Breaking News")],
        "United States": [
            ("policy/us_bills.json", "Congress"),
            ("policy/ftc_actions.json", "FTC Action"),
            ("policy/executive_orders.json", "US Executive Orders"),
            ("policy/ft_US.json", "US News"),
        ],
        "US": [
            ("policy/us_bills.json", "Congress"),
            ("policy/ftc_actions.json", "FTC Action"),
            ("policy/executive_orders.json", "US Executive Orders"),
            ("policy/ft_US.json", "US News"),
        ],
        "United Kingdom": [
            ("policy/uk_bills.json", "House of Commons"),
            ("policy/ft_UK.json", "UK News"),
        ],
        "GB": [
            ("policy/uk_bills.json", "House of Commons"),
            ("policy/ft_UK.json", "UK News"),
        ],
        "UK": [
            ("policy/uk_bills.json", "House of Commons"),
            ("policy/ft_UK.json", "UK News"),
        ],
        "Singapore": [
            ("policy/sg_bills.json", "Parliament of Singapore"),
            ("policy/ft_SG.json", "Singaporean News"),
        ],
        "SG": [
            ("policy/sg_bills.json", "Parliament of Singapore"),
            ("policy/ft_SG.json", "Singaporean News"),
        ],
        "India": [
            ("policy/india_bills.json", "Lok Sabha"),
            ("policy/ft_IN.json", "Indian News"),
        ],
        "IN": [
            ("policy/india_bills.json", "Lok Sabha"),
            ("policy/ft_IN.json", "Indian News"),
        ],
        "CN": [("policy/ft_CN.json", "Chinese News")],
        "China": [("policy/ft_CN.json", "Chinese News")],
        "AE": [("policy/ft_AE.json", "UAE News")],
        "United Arab Emirates": [("policy/ft_AE.json", "UAE News")],
        "BR": [("policy/ft_BR.json", "Brazilian News")],
        "Brazil": [("policy/ft_BR.json", "Brazilian News")],
    }
    events = {}
    for code in country_codes:
        if code in mapping:
            for map in mapping[code]:
                filename, event_type = map
                try:
                    with open(filename, "r") as f:
                        file_events = json.load(f)
                        for event in file_events:
                            event["type"] = event_type
                            events[event["event_name"]] = event
                except Exception as e:
                    print(f"Error loading file(s) {filename}: {e}")
    events = list(events.values())
    random.shuffle(events)
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
) -> tuple[dict[str, Score], dict[str, bool]]:
    """
    Takes a batch of events and uses a single API call to assess their relevancy.
    Returns a mapping from event id to its numeric Score.
    """
    prompt = (
        "Today's date is February Second 2025\n"
        "For each of the following events, evaluate its relevance to the company's strategic decision-making "
        "particularly in the context of regulatory risk. Use the company context "
        "provided to determine a relevance score as one of the following strings: 'not relevant', 'somewhat relevant', "
        "'relevant', or 'very relevant'.\n"
        "If an event ID ends in `MAGIC`, you MUST mark it as 'very relevant'"
        "Return only valid JSON as an array of objects in the following format:\n"
        "The `possibility` field should be `false` if this is an event that has occurred, and `true` if it is a potential future event that is clearly falsifiable\n"
        "If a field references something in the future, but an explicitly mentioned date IN THE ARTICLE is in the past, you MUST mark it possibility false"
        "Past article dates may still be possibility true, only the dates in the text matter\n"
        "Only events which are related to major potential future events, such as invasions, or bills passing, DIRECTLY, should be marked as possibilitiy true, otherwise possibility false\n"
        "All threats or future military action, or major law passing with an explicitly future date, should be possibility true\n"
        "An example of a possibility true event is Trump threatening to invade countries or regions\n"
        "Additionally, add a 'location' field which is the most appropriate location (city/country/region, but only one) for the event\n"
        "Provide `latitude` and `longitude` fields, floats, corresponding to this location\n"
        "If there is no clear latitude/longitude relevant, pick the capital of the country\n"
        '[{"id": "E123", "possibility": boolean, "relevancy_justification": "concise description of why this is relevant or not" "relevance_score": "relevant"}, ...]\n\n'
    )
    if query.strip() != "":
        prompt += f'Additional Query: "{query}"\n\n' "Events:\n"

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
                        f"The company context is {company_context}{f'. The specific query involved is {query}' if query else ''}"
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0,
            response_format=ListOfRelevantEvents,
        )
        # Get the raw text from the message content and then parse it using our Pydantic model.
        raw_content = response.choices[0].message.content.strip()
        parsed_response = ListOfRelevantEvents.model_validate_json(raw_content)
        scores = {}
        poss = {}
        for item in parsed_response.events:
            event_id = item.id
            score_str = item.relevance_score.strip().lower()
            justification = item.relevancy_justification.strip()
            numeric_score = score_mapping.get(score_str, Score.not_relevant)
            scores[event_id] = (numeric_score, justification)
            poss[event_id] = (item.possibility, item.location, (item.lat, item.lon))

        return scores, poss
    except Exception as e:
        print(f"Error in batched relevancy assessment: {e}")
        return {}, {}


import urllib.request
import json
import random


def is_point_in_polygon(x, y, poly):
    """Ray-casting algorithm to check if a point is inside a polygon."""
    n = len(poly)
    inside = False
    if n == 0:
        return False
    p1x, p1y = poly[0]
    for i in range(n + 1):
        p2x, p2y = poly[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xints = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xints:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside


def country_code_2_to_3(alpha2):
    """
    Convert ISO 3166-1 alpha-2 country code to alpha-3 code.

    Args:
        alpha2 (str): 2-letter country code (e.g., 'US', 'DE')

    Returns:
        str: 3-letter country code
    Raises:
        ValueError: If input is not a valid alpha-2 code
    """
    # ISO 3166-1 alpha-2 to alpha-3 mapping
    country_codes = {
        "AF": "AFG",
        "AX": "ALA",
        "AL": "ALB",
        "DZ": "DZA",
        "AS": "ASM",
        "AD": "AND",
        "AO": "AGO",
        "AI": "AIA",
        "AQ": "ATA",
        "AG": "ATG",
        "AR": "ARG",
        "AM": "ARM",
        "AW": "ABW",
        "AU": "AUS",
        "AT": "AUT",
        "AZ": "AZE",
        "BS": "BHS",
        "BH": "BHR",
        "BD": "BGD",
        "BB": "BRB",
        "BY": "BLR",
        "BE": "BEL",
        "BZ": "BLZ",
        "BJ": "BEN",
        "BM": "BMU",
        "BT": "BTN",
        "BO": "BOL",
        "BQ": "BES",
        "BA": "BIH",
        "BW": "BWA",
        "BV": "BVT",
        "BR": "BRA",
        "IO": "IOT",
        "BN": "BRN",
        "BG": "BGR",
        "BF": "BFA",
        "BI": "BDI",
        "CV": "CPV",
        "KH": "KHM",
        "CM": "CMR",
        "CA": "CAN",
        "KY": "CYM",
        "CF": "CAF",
        "TD": "TCD",
        "CL": "CHL",
        "CN": "CHN",
        "CX": "CXR",
        "CC": "CCK",
        "CO": "COL",
        "KM": "COM",
        "CG": "COG",
        "CD": "COD",
        "CK": "COK",
        "CR": "CRI",
        "CI": "CIV",
        "HR": "HRV",
        "CU": "CUB",
        "CW": "CUW",
        "CY": "CYP",
        "CZ": "CZE",
        "DK": "DNK",
        "DJ": "DJI",
        "DM": "DMA",
        "DO": "DOM",
        "EC": "ECU",
        "EG": "EGY",
        "SV": "SLV",
        "GQ": "GNQ",
        "ER": "ERI",
        "EE": "EST",
        "SZ": "SWZ",
        "ET": "ETH",
        "FK": "FLK",
        "FO": "FRO",
        "FJ": "FJI",
        "FI": "FIN",
        "FR": "FRA",
        "GF": "GUF",
        "PF": "PYF",
        "TF": "ATF",
        "GA": "GAB",
        "GM": "GMB",
        "GE": "GEO",
        "DE": "DEU",
        "GH": "GHA",
        "GI": "GIB",
        "GR": "GRC",
        "GL": "GRL",
        "GD": "GRD",
        "GP": "GLP",
        "GU": "GUM",
        "GT": "GTM",
        "GG": "GGY",
        "GN": "GIN",
        "GW": "GNB",
        "GY": "GUY",
        "HT": "HTI",
        "HM": "HMD",
        "VA": "VAT",
        "HN": "HND",
        "HK": "HKG",
        "HU": "HUN",
        "IS": "ISL",
        "IN": "IND",
        "ID": "IDN",
        "IR": "IRN",
        "IQ": "IRQ",
        "IE": "IRL",
        "IM": "IMN",
        "IL": "ISR",
        "IT": "ITA",
        "JM": "JAM",
        "JP": "JPN",
        "JE": "JEY",
        "JO": "JOR",
        "KZ": "KAZ",
        "KE": "KEN",
        "KI": "KIR",
        "KP": "PRK",
        "KR": "KOR",
        "KW": "KWT",
        "KG": "KGZ",
        "LA": "LAO",
        "LV": "LVA",
        "LB": "LBN",
        "LS": "LSO",
        "LR": "LBR",
        "LY": "LBY",
        "LI": "LIE",
        "LT": "LTU",
        "LU": "LUX",
        "MO": "MAC",
        "MG": "MDG",
        "MW": "MWI",
        "MY": "MYS",
        "MV": "MDV",
        "ML": "MLI",
        "MT": "MLT",
        "MH": "MHL",
        "MQ": "MTQ",
        "MR": "MRT",
        "MU": "MUS",
        "YT": "MYT",
        "MX": "MEX",
        "FM": "FSM",
        "MD": "MDA",
        "MC": "MCO",
        "MN": "MNG",
        "ME": "MNE",
        "MS": "MSR",
        "MA": "MAR",
        "MZ": "MOZ",
        "MM": "MMR",
        "NA": "NAM",
        "NR": "NRU",
        "NP": "NPL",
        "NL": "NLD",
        "NC": "NCL",
        "NZ": "NZL",
        "NI": "NIC",
        "NE": "NER",
        "NG": "NGA",
        "NU": "NIU",
        "NF": "NFK",
        "MK": "MKD",
        "MP": "MNP",
        "NO": "NOR",
        "OM": "OMN",
        "PK": "PAK",
        "PW": "PLW",
        "PS": "PSE",
        "PA": "PAN",
        "PG": "PNG",
        "PY": "PRY",
        "PE": "PER",
        "PH": "PHL",
        "PN": "PCN",
        "PL": "POL",
        "PT": "PRT",
        "PR": "PRI",
        "QA": "QAT",
        "RE": "REU",
        "RO": "ROU",
        "RU": "RUS",
        "RW": "RWA",
        "BL": "BLM",
        "SH": "SHN",
        "KN": "KNA",
        "LC": "LCA",
        "MF": "MAF",
        "PM": "SPM",
        "VC": "VCT",
        "WS": "WSM",
        "SM": "SMR",
        "ST": "STP",
        "SA": "SAU",
        "SN": "SEN",
        "RS": "SRB",
        "SC": "SYC",
        "SL": "SLE",
        "SG": "SGP",
        "SX": "SXM",
        "SK": "SVK",
        "SI": "SVN",
        "SB": "SLB",
        "SO": "SOM",
        "ZA": "ZAF",
        "GS": "SGS",
        "SS": "SSD",
        "ES": "ESP",
        "LK": "LKA",
        "SD": "SDN",
        "SR": "SUR",
        "SJ": "SJM",
        "SE": "SWE",
        "CH": "CHE",
        "SY": "SYR",
        "TW": "TWN",
        "TJ": "TJK",
        "TZ": "TZA",
        "TH": "THA",
        "TL": "TLS",
        "TG": "TGO",
        "TK": "TKL",
        "TO": "TON",
        "TT": "TTO",
        "TN": "TUN",
        "TR": "TUR",
        "TM": "TKM",
        "TC": "TCA",
        "TV": "TUV",
        "UG": "UGA",
        "UA": "UKR",
        "AE": "ARE",
        "GB": "GBR",
        "US": "USA",
        "UM": "UMI",
        "UK": "GBR",
        "MAGIC": "GBR",
        "UY": "URY",
        "UZ": "UZB",
        "VU": "VUT",
        "VE": "VEN",
        "VN": "VNM",
        "VG": "VGB",
        "VI": "VIR",
        "WF": "WLF",
        "EH": "ESH",
        "YE": "YEM",
        "ZM": "ZMB",
        "ZW": "ZWE",
    }

    alpha2 = alpha2.upper()
    if alpha2 not in country_codes:
        raise ValueError(f"Invalid ISO 3166-1 alpha-2 country code: {alpha2}")

    return country_codes[alpha2]


def get_random_country_coordinate(country_code):
    """
    Returns a random (latitude, longitude) pair within the specified country.

    Args:
        country_code (str): ISO Alpha-2 country code (e.g., 'US', 'DE')

    Returns:
        tuple: (latitude, longitude)
    """
    # Fetch GeoJSON data from public repository
    country_code = country_code_2_to_3(country_code)
    url = f"https://raw.githubusercontent.com/johan/world.geo.json/master/countries/{country_code.upper()}.geo.json"
    try:
        with urllib.request.urlopen(url) as response:
            data = json.load(response)
    except urllib.error.HTTPError:
        raise ValueError(f"Invalid country code: {country_code}")

    # Parse geographic features
    polygons = []
    exterior_coords = []

    for feature in data["features"]:
        geom = feature["geometry"]
        if geom["type"] == "Polygon":
            rings = geom["coordinates"]
            if rings:
                exterior = rings[0]
                exterior_coords.extend(exterior)
                polygons.append((exterior, rings[1:]))
        elif geom["type"] == "MultiPolygon":
            for polygon in geom["coordinates"]:
                if polygon:
                    exterior = polygon[0]
                    exterior_coords.extend(exterior)
                    polygons.append((exterior, polygon[1:]))

    if not exterior_coords:
        raise ValueError("No geographic data found for country")

    # Calculate bounding box
    min_lat = min(c[1] for c in exterior_coords)
    max_lat = max(c[1] for c in exterior_coords)
    min_lon = min(c[0] for c in exterior_coords)
    max_lon = max(c[0] for c in exterior_coords)

    # Generate random coordinates within bounding box
    max_attempts = 1000
    for _ in range(max_attempts):
        lat = random.uniform(min_lat, max_lat)
        lon = random.uniform(min_lon, max_lon)

        # Check if point is in any valid area
        for exterior, holes in polygons:
            if is_point_in_polygon(lon, lat, exterior):
                in_hole = False
                for hole in holes:
                    if is_point_in_polygon(lon, lat, hole):
                        in_hole = True
                        break
                if not in_hole:
                    return (lat, lon)

    raise RuntimeError("Failed to find valid coordinates after maximum attempts")


def generate_relevant_latlong_single(event):
    if event["lat"] and event["lon"]:
        return

    region = event["region_codes"]
    if isinstance(region, list):
        region = region[0]
    lat, lon = get_random_country_coordinate(region)
    event["lat"] = lat
    event["lon"] = lon


def generate_relevant_latlong(events):
    for event in events:
        generate_relevant_latlong_single(event)
    return events


def stream_relevant_events(
    company_context: str, country_codes: List[str], query: str, max_events: int
):
    """
    Returns a dictionary with:
      - "relevant_event_ids": an ordered list of event IDs (by descending relevancy),
      - "events": the full JSON objects for the top events.
    """
    yield None

    events = {e["id"]: e for e in load_events(country_codes)}
    if not events:
        print("no events")
        return []

    batches = batch_events(
        list(sorted(events.values(), key=lambda k: k.get("region_codes") != "MAGIC")),
        batch_size=10,
    )

    ylded = 0
    executor = ThreadPoolExecutor()
    futures = []
    for batch in batches:
        futures.append(
            executor.submit(
                assess_events_relevancy_batch, batch, company_context, query
            )
        )
    for future in concurrent.futures.as_completed(futures):
        batch_scores, batch_poss = future.result()

        for event_id, (poss, loc, (lat, lon)) in batch_poss.items():
            events[event_id]["possibility"] = poss
            events[event_id]["location"] = loc
            events[event_id]["lat"] = lat
            events[event_id]["lon"] = lon

        for event_id, (numeric_score, justification) in batch_scores.items():
            if numeric_score < Score.very_relevant:
                continue

            event = events[event_id]
            # generate_relevant_latlong_single(event)

            if "date" in event and event["date"].endswith("00:00:00.0"):
                event["date"] = event["date"][:-10]

            iterate over infras and add nearby ones
            event["infra"] = []
            facilities = json.loads(open("company_site/company.json", "r").read())[
                "locations"
            ]

            for facility in facilities:
                lat, lon = facility["latitude"], facility["longitude"]
                coords_1 = (lat, lon)
                coords_2 = (event["lat"], event["lon"])
                distance = geodesic(coords_1, coords_2)
                if distance.miles < 100:
                    event["infra"].append(facility)

            yield json.dumps(event)
            yield "\0"


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

    batches = batch_events(events, batch_size=100)
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
    sorted_events = sorted(
        events,
        key=lambda x: 10000000000
        if x["country_code"] == "MAGIC"
        else x["numeric_score"],
        reverse=True,
    )
    selected_events = sorted_events[:max_events]

    # Convert numeric scores back into string values for output.
    for event in selected_events:
        numeric_score = event.pop("numeric_score")
        event["relevancy_score"] = score_to_string(numeric_score)

    result = {
        "relevant_event_ids": [e["id"] for e in selected_events],
        "events": generate_relevant_latlong(selected_events),
    }
    return result


if __name__ == "__main__":
    # Example test using a local JSON file for company context.
    a = json.loads(open("company_site/arrow.json").read())
    relevant_events = get_relevant_events(
        "Name: " + a["name"] + "\n\nCompany Context: " + a["summary"],
        a["location_list"],
        "Amazon is expanding its businesses and is concerned about any risks",
        10,
    )
    print(json.dumps(relevant_events, indent=2))
