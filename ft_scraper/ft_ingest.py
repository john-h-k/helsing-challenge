import json

if __name__ == "__main__":
    # read in ft.json
    with open("ft.json", "r") as f:
        articles = json.load(f)

    formatted_articles = []
    index = 0

    for article in articles:
        if article is None:
            continue

        # get title, description, and published_date
        title = article.get("title", None)
        description = article.get("description", None)
        published_date = article.get("published_date", None)

        if title is None or description is None or published_date is None:
            continue

        # get the body of the article, and stitch it together
        body_sections = article.get("content", None)
        if body_sections is None:
            continue

        body = ""
        for section in body_sections:
            if section["type"] == "text":
                body += "\n" + section["content"]

        # iterate and add the article to formatted_articles
        index += 1
        formatted_articles.append(
            {
                "uuid": index,
                "event_name": title,
                "blurb": description,
                "region_codes": "NA",
                "body": body,
                "date": published_date[:10],
                "metadata": "",
            }
        )

    # write out formatted_articles.json
    with open("formatted_articles.json", "w") as f:
        json.dump(formatted_articles, f, indent=2)
