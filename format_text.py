import re

def clean_and_format_text(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    formatted_lines = []
    current_paragraph = []

    # Regex patterns for headers and footers
    page_num_pattern = re.compile(r'^[\dixv]+$|^\d+\s*$', re.IGNORECASE)
    header_pattern1 = re.compile(r'^Reflecting on The\s*Names of Allah\s*$', re.IGNORECASE)
    header_pattern2 = re.compile(r'^Reflecting on The\s*Names of All all\s*$', re.IGNORECASE)
    garbage_pattern = re.compile(r'^@\s*1潑$|^@\s*.*$|^[.:_V•\'W\-\s]+$')

    for i, line in enumerate(lines):
        line = line.strip()

        # Skip headers/footers
        if page_num_pattern.match(line) or header_pattern1.match(line) or header_pattern2.match(line) or garbage_pattern.match(line):
            continue

        # Handle drop cap anomaly (e.g., "A" on one line, "llah" on the next)
        if len(line) == 1 and line.isalpha() and i + 1 < len(lines):
            next_line = lines[i+1].strip()
            if next_line and next_line[0].islower():
                current_paragraph.append(line)
                continue

        # If it looks like a chapter title (e.g. all caps and has (number)), force a break
        if re.search(r'\([\diI]+(-\d+)?\)', line):
            letters = [c for c in line if c.isalpha()]
            if letters and (sum(1 for c in letters if c.isupper()) / len(letters)) > 0.4:
                # Force paragraph break before chapter title
                if current_paragraph:
                    paragraph_text = ' '.join(current_paragraph)
                    paragraph_text = re.sub(r'-\s+', '', paragraph_text)
                    formatted_lines.append(paragraph_text)
                    current_paragraph = []
                formatted_lines.append(line)
                continue

        # Empty line denotes paragraph break
        if not line:
            if current_paragraph:
                # Join the current paragraph
                paragraph_text = ' '.join(current_paragraph)
                
                # Fix hyphenated line breaks (e.g., "some- thing" or "some-thing")
                paragraph_text = re.sub(r'-\s+', '', paragraph_text)
                
                # Fix drop caps: only merge if it's the very first letter of the paragraph
                if len(paragraph_text) > 2 and paragraph_text[1] == ' ' and paragraph_text[2].islower():
                    # Check if it's not "I " or "A " which are valid words, unless it's a known drop cap
                    if paragraph_text.startswith("A llah"):
                        paragraph_text = "Allah" + paragraph_text[6:]
                    elif paragraph_text[0] != 'I' and paragraph_text[0] != 'A':
                        paragraph_text = paragraph_text[0] + paragraph_text[2:]
                    elif paragraph_text.startswith("I "):
                        pass # Valid word
                    elif paragraph_text.startswith("A "):
                        pass # Valid word

                formatted_lines.append(paragraph_text)
                current_paragraph = []
            continue

        # Add to current paragraph
        current_paragraph.append(line)

    # Don't forget the last paragraph
    if current_paragraph:
        paragraph_text = ' '.join(current_paragraph)
        paragraph_text = re.sub(r'-\s+', '', paragraph_text)
        
        if len(paragraph_text) > 2 and paragraph_text[1] == ' ' and paragraph_text[2].islower():
            if paragraph_text.startswith("A llah"):
                paragraph_text = "Allah" + paragraph_text[6:]
            elif paragraph_text[0] != 'I' and paragraph_text[0] != 'A':
                paragraph_text = paragraph_text[0] + paragraph_text[2:]

        formatted_lines.append(paragraph_text)

    # Write formatted text
    with open(output_file, 'w', encoding='utf-8') as f:
        for p in formatted_lines:
            f.write(p + '\n\n')

if __name__ == "__main__":
    input_path = "Reflecting_On_the_Names_of_Allah.txt"
    output_path = "Reflecting_On_the_Names_of_Allah_readable.txt"
    print("Formatting text...")
    clean_and_format_text(input_path, output_path)
    print(f"Readable text saved to {output_path}")
