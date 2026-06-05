#!/usr/bin/env python3
"""Extract content from a URL or text file, output JSON for render.js"""

import sys
import json
import re
import requests
from lxml import html as lxml_html
from urllib.parse import urlparse

def extract_from_url(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (compatible; yuanfang-html-image/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
    }
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        resp.encoding = resp.apparent_encoding or 'utf-8'
    except Exception as e:
        return {'title': f'Error fetching URL', 'content': str(e), 'source': url, 'points': []}

    tree = lxml_html.fromstring(resp.content)

    title = ''
    og_title = tree.xpath("//meta[@property='og:title']/@content")
    if og_title:
        title = og_title[0]
    else:
        t = tree.xpath("//title/text()")
        if t:
            title = t[0].strip()
    title = clean_text(title)

    desc = ''
    og_desc = tree.xpath("//meta[@property='og:description']/@content")
    if og_desc:
        desc = og_desc[0]
    else:
        meta_desc = tree.xpath("//meta[@name='description']/@content")
        if meta_desc:
            desc = meta_desc[0]
    desc = clean_text(desc)

    body_texts = []
    for tag in ['h1', 'h2', 'h3', 'p']:
        elements = tree.xpath(f'//{tag}[not(ancestor::nav)][not(ancestor::header)][not(ancestor::footer)]/text()')
        for el in elements[:30]:
            t = clean_text(el)
            if len(t) > 15:
                body_texts.append(t)

    body = ' '.join(body_texts[:8]) if body_texts else desc

    return {
        'title': title or urlparse(url).netloc,
        'content': body or desc,
        'source': url,
        'points': [],
    }

def extract_from_text(text):
    lines = [l.strip() for l in text.strip().split('\n') if l.strip()]
    if not lines:
        return {'title': '', 'content': '', 'source': '', 'points': []}
    title = lines[0]
    content_lines = []
    points = []
    for line in lines[1:]:
        if line.startswith('-') or line.startswith('•') or line.startswith('*'):
            points.append(line.lstrip('-•* '))
        else:
            content_lines.append(line)
    return {
        'title': title,
        'content': ' '.join(content_lines) if content_lines else '',
        'source': '',
        'points': points,
    }

def clean_text(t):
    t = re.sub(r'\s+', ' ', t or '')
    return t.strip()[:200]

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'title': '', 'content': '', 'source': '', 'points': []}))
        return

    input_arg = sys.argv[1]

    if input_arg.startswith('http://') or input_arg.startswith('https://'):
        result = extract_from_url(input_arg)
    elif input_arg == '--file' and len(sys.argv) > 2:
        with open(sys.argv[2], 'r') as f:
            text = f.read()
        result = extract_from_text(text)
    else:
        result = extract_from_text(input_arg)

    print(json.dumps(result, ensure_ascii=False))

if __name__ == '__main__':
    main()
