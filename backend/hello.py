import openai
from collections import defaultdict
import json


def generate_effects(policy_order, model="o3-mini-high", num_effects=10):
    """
    Uses OpenAI's model to generate structured effects based on a policy order.
    """
    system_prompt = """
    You are an expert policy analyst. Given a policy order, generate a set of cascading effects.
    Each effect should be structured as follows:
    {
        "name": string, /* succinct unique name for effect */
        "order": integer, /* first/second/third order effect */
        "parent": "root" | array[string], /* root for first order effect, else the "name"s of the effects it occurs from, */
        "description": string,
        "p_given_parent": map[string, float from 0..1] /* probability of occurrence given parent */
    }
    """

    user_prompt = f"""
    Generate {num_effects} structured cascading effects for the following policy order:
    "{policy_order}"
    Output JSON only.
    """

    response = openai.ChatCompletion.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format="json",
    )

    effects = json.loads(response["choices"][0]["message"]["content"])
    return effects


def build_effects_tree(effects):
    """
    Builds a tree-like structure from the generated effects.
    """
    tree = defaultdict(list)

    for effect in effects:
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
            print_tree(tree, effect["name"], level + 1)


if __name__ == "__main__":
    policy_order = input()
    effects = generate_effects(policy_order)
    effects_tree = build_effects_tree(effects)
    print_tree(effects_tree)
