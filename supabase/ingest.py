
import os
import re

import dotenv

from bs4 import BeautifulSoup
from markdownify import MarkdownConverter
from supabase.client import create_client

from langchain.document_loaders import AsyncHtmlLoader
from langchain.text_splitter import MarkdownHeaderTextSplitter
from langchain.vectorstores import SupabaseVectorStore
from langchain.embeddings import OpenAIEmbeddings

# # fix asyncio error in Jupyter Notebook 
# import nest_asyncio
# nest_asyncio.apply()

dotenv.load_dotenv()

urls = [
    "https://manual.sspai.com/",
    "https://manual.sspai.com/guide/idea",
    "https://manual.sspai.com/guide/init",
    "https://manual.sspai.com/guide/proc",
    "https://manual.sspai.com/guide/good",
    "https://manual.sspai.com/rules/review",
    "https://manual.sspai.com/rules/special",
    "https://manual.sspai.com/rules/style",
    "https://manual.sspai.com/rules/aggrement",
    "https://manual.sspai.com/about/contact",
    "https://manual.sspai.com/about/license",
    "https://manual.sspai.com/about/changelog",
]


htmls = AsyncHtmlLoader(urls).load()

md_splitter = MarkdownHeaderTextSplitter(
    headers_to_split_on=[
        ("#", "h1"),
        ("##", "h2"),
        ("###", "h3"),
        ("####", "h4"),
    ]
)

docs = []
for html in htmls:
    metadata = html.metadata
    soup = BeautifulSoup(html.page_content, "html.parser")
    article = soup.find("article")
    if article is not None:
        markdown = MarkdownConverter(heading_style="ATX").convert_soup(article)
        markdown = re.sub('\[¶\].*"Permanent link"\)', "", markdown)
        texts = md_splitter.split_text(markdown)
        for text in texts:
            text.page_content = (
                "<章节位置: "
                + " > ".join([
                    text.metadata.get(k)
                    for k in ["h1", "h2", "h3"]
                    if text.metadata.get(k)
                ])
                + ">\n"
                + text.page_content
            )
            text.metadata.update(metadata)
        docs.extend(texts)


client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
vc = SupabaseVectorStore.from_documents(docs, OpenAIEmbeddings(), client=client)
