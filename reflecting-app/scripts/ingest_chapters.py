import json
import re

def slugify(s):
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')

def clean_paragraph(p):
    p = re.sub(r'  +', ' ', p)
    return p.strip()

def is_chapter_title(line):
    # Most chapter titles are uppercase and contain a number in parentheses like (1) or (i-2)
    line = line.strip()
    if len(line) < 5 or len(line) > 150:
        return False
    
    # Check if there is a parenthesis with numbers/i at start or end
    has_number_marker = re.search(r'\([\diI]+(-\d+)?\)', line)
    
    # Check if it's mostly uppercase
    letters = [c for c in line if c.isalpha()]
    if not letters:
        return False
    upper_count = sum(1 for c in letters if c.isupper())
    
    # If it has the number marker and is mostly upper, it's definitely a chapter title
    if has_number_marker and (upper_count / len(letters)) > 0.4:
        print(f"DEBUG match: {line}")
        return True
        
    return False

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    line_to_page = []
    current_page = 1
    for line in lines:
        m = re.match(r'^---PAGE_(\d+)---', line.strip())
        if m:
            current_page = int(m.group(1))
        line_to_page.append(current_page)

    chapters = []
    current_chapter = None
    current_paragraphs = []
    start_line = 0
    
    for i, line in enumerate(lines):
        # Ignore page marker lines
        if re.match(r'^---PAGE_(\d+)---', line.strip()):
            continue
            
        stripped = line.strip()
        if not stripped:
            continue
            
        # Ignore TOC lines (roughly before the first real chapter)
        if is_chapter_title(stripped) and len(chapters) == 0 and "GUIDE" not in stripped.upper():
            pass # Skipping TOC

        if is_chapter_title(stripped) and "GUIDE" in stripped.upper() and len(chapters) == 0:
            # First chapter starts
            current_chapter = stripped
            current_paragraphs = []
            start_line = i
            continue
            
        if is_chapter_title(stripped) and current_chapter is not None:
            # Save previous chapter
            start_page = line_to_page[start_line]
            end_page = line_to_page[max(0, i - 1)]
            chapters.append({
                "id": slugify(current_chapter),
                "number": len(chapters) + 1,
                "title": current_chapter.strip('©®()0123456789i- '), # basic clean
                "arabicName": "",
                "translation": "",
                "body": [],
                "pages": list(range(start_page, end_page + 1))
            })
            current_chapter = stripped
            current_paragraphs = []
            start_line = i
            continue
            
        if current_chapter is not None:
            current_paragraphs.append(clean_paragraph(stripped))
            
    # Add last chapter
    if current_chapter is not None:
        start_page = line_to_page[start_line]
        end_page = line_to_page[-1]
        chapters.append({
            "id": slugify(current_chapter),
            "number": len(chapters) + 1,
            "title": current_chapter.strip('©®()0123456789i- '),
            "arabicName": "",
            "translation": "",
            "body": [],
            "pages": list(range(start_page, end_page + 1))
        })
        
    return chapters

if __name__ == "__main__":
    filepath = "/Users/nabilpervez/Documents/reflecting-on-the-names-of-allah-book/Reflecting_On_the_Names_of_Allah_paginated.txt"
    chapters = process_file(filepath)
    print(f"Total chapters: {len(chapters)}")
    for c in chapters[:3]:
        print(f"  {c['number']}. {c['title']} ({len(c['body'])} paragraphs)")
        
    outpath = "/Users/nabilpervez/Documents/reflecting-on-the-names-of-allah-book/reflecting-app/public/names.json"
    with open(outpath, 'w', encoding='utf-8') as f:
        json.dump(chapters, f, indent=2, ensure_ascii=False)
    print(f"✅ Wrote JSON to {outpath}")
