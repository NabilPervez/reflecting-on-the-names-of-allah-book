import os
import sys
import json
import time

def install_and_import(package):
    import subprocess
    try:
        __import__(package)
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package, "--break-system-packages"])
    finally:
        globals()[package] = __import__(package)

install_and_import('google.generativeai')
import google.generativeai as genai

API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("Error: Please set the GEMINI_API_KEY environment variable.")
    print("Example: export GEMINI_API_KEY='your_api_key'")
    sys.exit(1)

genai.configure(api_key=API_KEY)

# Use gemini-1.5-flash
model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    system_instruction=(
        "You are an expert English copywriter with deep Islamic knowledge. "
        "Your task is to fix OCR errors, typos, missing characters, hyphenation issues, and formatting issues "
        "from the provided text, which was extracted from a book on the 99 Names of Allah. "
        "Fix the text to make it perfectly readable while preserving the original meaning completely. "
        "Remove any weird symbols, stray page numbers, headers, and broken drop-caps. "
        "Do not add commentary, summaries, or introductory remarks. "
        "Return ONLY the corrected, clean English text. "
        "Separate paragraphs with a double newline."
    )
)

def fix_text_with_gemini(text_block):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = model.generate_content(
                f"Fix this text:\n\n{text_block}",
                generation_config=genai.types.GenerationConfig(
                    temperature=0.2,
                )
            )
            return response.text.strip()
        except Exception as e:
            print(f"Error on attempt {attempt+1}: {e}")
            if attempt < max_retries - 1:
                time.sleep(5)
            else:
                print("Failed to get response after multiple attempts.")
                return text_block

def main():
    json_path = os.path.join("reflecting-app", "public", "names.json")
    if not os.path.exists(json_path):
        print(f"Could not find {json_path}")
        sys.exit(1)
        
    print(f"Loading {json_path}...")
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    total_names = len(data)
    print(f"Found {total_names} names to process.")
    
    # Process each name
    for i, name_obj in enumerate(data):
        print(f"Processing ({i+1}/{total_names}): {name_obj.get('title', 'Unknown')}")
        
        # The body is an array of paragraphs. We join them to give the model full context
        body_array = name_obj.get("body", [])
        if not body_array:
            continue
            
        full_text = "\n\n".join(body_array)
        
        print("  - Sending to Gemini...")
        corrected_text = fix_text_with_gemini(full_text)
        
        # Split back into paragraphs
        paragraphs = [p.strip() for p in corrected_text.split("\n\n") if p.strip()]
        
        name_obj["body"] = paragraphs
        
        # Save incrementally in case it crashes
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            
        print("  - Saved.")
        
        # Rate limit safety
        time.sleep(2)
        
    print("All done! The text has been fully corrected and updated.")

if __name__ == "__main__":
    main()
