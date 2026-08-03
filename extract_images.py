import fitz  # PyMuPDF
import os

def main():
    pdf_path = "Reflecting_On_the_Names_of_Allah.pdf"
    out_dir = "reflecting-app/public/pages"
    txt_out = "Reflecting_On_the_Names_of_Allah_paginated.txt"
    
    if not os.path.exists(out_dir):
        os.makedirs(out_dir)
        
    doc = fitz.open(pdf_path)
    print(f"Opened {pdf_path} with {len(doc)} pages.")
    
    full_text = []
    
    # 2.0 zoom is ~144 DPI (default is 72 DPI)
    mat = fitz.Matrix(2.0, 2.0)
    
    image_page_num = 1
    
    for i in range(len(doc)):
        page = doc[i]
        
        pix = page.get_pixmap(matrix=mat)
        img_path = os.path.join(out_dir, f"page_{image_page_num}.jpg")
        pix.save(img_path)
        
        text = page.get_text()
        full_text.append(f"---PAGE_{image_page_num}---\n")
        full_text.append(text)
        image_page_num += 1
            
        if (i + 1) % 10 == 0:
            print(f"Processed {i + 1} PDF pages... (Generated {image_page_num - 1} images)")
            
    print("Writing paginated text...")
    with open(txt_out, "w", encoding="utf-8") as f:
        f.write("\n".join(full_text))
        
    print(f"Done! Generated {image_page_num - 1} images in {out_dir}")
    print(f"Saved paginated text to {txt_out}")

if __name__ == "__main__":
    main()
