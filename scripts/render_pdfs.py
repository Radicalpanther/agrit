import base64
import os
import sys
from playwright.sync_api import sync_playwright

def render_pdfs():
    artifacts_dir = os.path.join(os.getcwd(), 'verification-artifacts')
    pdf_files = [f for f in os.listdir(artifacts_dir) if f.endswith('.pdf')]
    print(f'Found PDF files: {pdf_files}')

    html_template = """
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</head>
<body style="margin: 0; background: #ffffff;">
  <div id="pages"></div>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    window.renderPdf = async function(base64Data) {
      const raw = window.atob(base64Data);
      const rawLength = raw.length;
      const array = new Uint8Array(new ArrayBuffer(rawLength));
      for (let i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
      }
      const pdf = await pdfjsLib.getDocument({ data: array }).promise;
      const pagesDiv = document.getElementById('pages');
      pagesDiv.innerHTML = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.id = 'page-' + i;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.display = 'block';
        pagesDiv.appendChild(canvas);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
      }
      return pdf.numPages;
    };
  </script>
</body>
</html>
"""

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_content(html_template)
        page.wait_for_timeout(1000)

        for pdf_name in pdf_files:
            pdf_path = os.path.join(artifacts_dir, pdf_name)
            with open(pdf_path, 'rb') as f:
                b64 = base64.b64encode(f.read()).decode('utf-8')

            num_pages = page.evaluate("base64 => window.renderPdf(base64)", b64)
            print(f'{pdf_name}: rendered {num_pages} pages')

            base_stem = os.path.splitext(pdf_name)[0]
            for page_idx in range(1, num_pages + 1):
                canvas = page.locator(f'#page-{page_idx}')
                png_path = os.path.join(artifacts_dir, f'{base_stem}-page-{page_idx}.png')
                canvas.screenshot(path=png_path)
                print(f'  Saved screenshot: {png_path}')

        browser.close()
    print('All PDF pages rendered to PNG successfully!')

if __name__ == '__main__':
    render_pdfs()
