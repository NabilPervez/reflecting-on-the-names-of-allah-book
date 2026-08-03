import sys
import subprocess

def install_and_import(package):
    try:
        __import__(package)
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
    finally:
        globals()[package] = __import__(package)

install_and_import('pypdf')

def main():
    pdf_path = "Reflecting_On_the_Names_of_Allah.pdf"
    txt_path = "Reflecting_On_the_Names_of_Allah.txt"
    
    print(f"Analyzing {pdf_path}...")
    reader = pypdf.PdfReader(pdf_path)
    
    num_pages = len(reader.pages)
    print(f"Found {num_pages} pages.")
    
    full_text = []
    for i in range(num_pages):
        page = reader.pages[i]
        text = page.extract_text()
        if text:
            full_text.append(text)
            
    final_text = "\n\n".join(full_text)
    
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(final_text)
        
    print(f"Successfully extracted text to {txt_path}")
    print(f"Total characters extracted: {len(final_text)}")

if __name__ == "__main__":
    main()
