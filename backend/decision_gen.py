from openai import OpenAI

client = OpenAI(api_key="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")
from collections import defaultdict
import json
from effect_gen import generate_effects


def generate_decisions(event: str, model="o1-mini", num_decisions=3):
    """
    Uses OpenAI's model to generate structured decisions based on a policy order.
    """
    system_prompt = """
    You are a senior company analyst.
    Given an event, and the company's business and other context, suggest 0 or more decisions that would be good for the company.
    Include reasoning
    """

    user_prompt = f"""
    Generate {num_decisions} structured cascading decisions the company could make for the following policy order:
    "{policy_order}"
    Output raw JSON only, that can be directly parsed as JSON
    """

    response = client.chat.completions.create(
        model="o3-mini",
        reasoning_effort = "high",
        messages=[
            {"role": "developer", "content": system_prompt},
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content

    if content.startswith("```json"):
        content = content[7:]
    if content.endswith("```"):
        content = content[:-3]

    print(content)
    decisions = json.loads(content)
    return decisions




if __name__ == "__main__":
    # policy_order = input()
    # policy_order = "Require 50% women for all FTSE 100 board members"
    policy_order = "Cap rent at £1k per month for 2 bedroom houses"
    decisions = generate_decisions(policy_order)
    
    print(decisions)
