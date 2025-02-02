from openai import OpenAI

client = OpenAI(
    # api_key="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"
)
from collections import defaultdict
import json


def generate_effects(company_context, policy_order, model="o1-mini", num_effects=10):
    """
    Uses OpenAI's model to generate structured effects based on a policy order.
    """
    system_prompt = f"""
    You are an expert policy analyst. Given a policy order, generate a set of cascading effects.
    The company context is {company_context}
    Each effect should be structured as follows:
    {{
        "name": string, /* succinct unique name for effect. Keep it in title case and spaced, so readable */
        "order": integer, /* first/second/third order effect */
        "parent": "root" | array[string], /* root for first order effect, else the "name"s of the effects it occurs from, */
        "description": string,
        "p_given_parent": map[string, float from 0..1] /* probability of occurrence given parent */
    }}

    """

    user_prompt = f"""
    Generate {num_effects} structured cascading effects for the following policy order:
    "{policy_order}"
    Output raw JSON only, that can be directly parsed as JSON.
    The JSON should be SINGLE objects, seperated by the text 'NEWITEM' (without quotes). Do not output markdown, just plain text
    """

    response = client.chat.completions.create(
        # model="o3-mini",
        # reasoning_effort="high",
        model="gpt-4o",
        messages=[
            {"role": "developer", "content": system_prompt},
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
        # response_format={"type": "json_object"},
        stream=True,
    )

    # content = response.choices[0].message.content

    # if content.startswith("```json"):
    #     content = content[7:]
    # if content.endswith("```"):
    #     content = content[:-3]

    # effects = json.loads(content)
    # return effects

    buff = ""
    for chunk in response:
        chunk = chunk.choices[0].delta.content

        if chunk is None or chunk.strip() == "":
            continue

        buff += chunk

        items = buff.split("NEWITEM")

        if len(items) > 1:
            for item in items[:-1]:
                yield item
                yield "\0"
            buff = items[-1]

    # return build_effects_tree(effects)


def build_effects_tree(effects):
    """
    Builds a tree-like structure from the generated effects.
    """
    tree = defaultdict(list)

    for effect in effects["effects"]:
        # print(effect)
        if effect["parent"] == "root":
            tree["root"].append(effect)
        else:
            for parent in effect["parent"]:
                tree[parent].append(effect)

    return tree


def print_tree(tree, node="root", level=0):
    """
    Pretty-prints the effects tree.
    """
    if node in tree:
        for effect in tree[node]:
            print("  " * level + f"- {effect['name']} (Order: {effect['order']})")
            print("  " * level + f"    \"{effect['description']}\"")

            print_tree(tree, effect["name"], level + 1)


if __name__ == "__main__":
    # policy_order = input()
    # policy_order = "Require 50% women for all FTSE 100 board members"
    policy_order = "Cap rent at £1k per month for 2 bedroom houses"
    effects_tree = generate_effects(policy_order)
    print_tree(effects_tree)
