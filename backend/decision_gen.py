from openai import OpenAI

client = OpenAI()
from collections import defaultdict
import json


def generate_decisions(event: str, model="o1-mini", num_effects=10):
    """
    Uses OpenAI's model to generate structured effects based on a policy order.
    """
    system_prompt = """
    You are a senior company analyst.
    Given an event, and the company's business and other context, suggest 0 or more decisions that would be good for the company.
    Include reasoning
    """

    user_prompt = f"""
    Generate {num_effects} structured cascading effects for the following policy order:
    "{policy_order}"
    Output raw JSON only, that can be directly parsed as JSON
    """

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "developer", "content": system_prompt},
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
        # response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content

    if content.startswith("```json"):
        content = content[7:]
    if content.endswith("```"):
        content = content[:-3]

    print(content)
    effects = json.loads(content)
    return effects


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
            print("  " * level + f"    \"{effect["description"]}\"")

            print_tree(tree, effect["name"], level + 1)


if __name__ == "__main__":
    # policy_order = input()
    # policy_order = "Require 50% women for all FTSE 100 board members"
    policy_order = "Cap rent at £1k per month for 2 bedroom houses"
    effects = generate_effects(policy_order)
    effects_tree = build_effects_tree(effects)
    print_tree(effects_tree)
