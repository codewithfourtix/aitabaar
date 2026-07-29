"""Generate the synthetic sample documents used in the live demo.

Three props the "SME owner" photographs and sends on WhatsApp:
mock CNIC, 6-month bank statement, utility bill. All clearly marked
SPECIMEN — no real person, entirely synthetic (see data/DATA_CARD.md).

Run: python generate_docs.py  (writes PNGs next to this file)
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).parent

# The demo applicant — consistent across all three documents so
# verification cross-checks pass on the clean file.
NAME = "MUHAMMAD IMRAN"
CNIC = "35202-1234567-1"
ADDRESS = "Shop 14, Akbari Mandi, Lahore"
DOB = "12-03-1988"


def font(size: int, bold: bool = False):
    names = ["arialbd.ttf" if bold else "arial.ttf", "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"]
    for n in names:
        try:
            return ImageFont.truetype(n, size)
        except OSError:
            continue
    return ImageFont.load_default()


def watermark(draw: ImageDraw.ImageDraw, w: int, h: int):
    draw.text((w // 2, h - 24), "SPECIMEN — SYNTHETIC DEMO DOCUMENT, NOT A REAL RECORD",
              font=font(16), fill=(180, 60, 60), anchor="mm")


def make_cnic():
    w, h = 860, 540
    img = Image.new("RGB", (w, h), (232, 240, 234))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([8, 8, w - 8, h - 8], radius=18, outline=(60, 110, 80), width=3)
    d.text((w // 2, 48), "PAKISTAN  National Identity Card (SPECIMEN)", font=font(28, True), fill=(20, 80, 50), anchor="mm")
    d.rectangle([40, 100, 260, 340], outline=(120, 120, 120), width=2)
    d.text((150, 220), "PHOTO", font=font(24), fill=(150, 150, 150), anchor="mm")
    rows = [("Name", NAME), ("Father Name", "MUHAMMAD ASLAM"), ("Identity Number", CNIC),
            ("Date of Birth", DOB), ("Address", ADDRESS)]
    y = 120
    for label, value in rows:
        d.text((300, y), label, font=font(18), fill=(90, 90, 90))
        d.text((300, y + 24), value, font=font(24, True), fill=(20, 20, 20))
        y += 64
    watermark(d, w, h)
    img.save(OUT / "cnic_specimen.png")


def make_bank_statement():
    w, h = 900, 1200
    img = Image.new("RGB", (w, h), "white")
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w, 90], fill=(0, 60, 130))
    d.text((30, 45), "UBL  •  Account Statement (SPECIMEN)", font=font(28, True), fill="white", anchor="lm")
    d.text((30, 120), f"Account Title: {NAME}", font=font(22, True), fill=(20, 20, 20))
    d.text((30, 152), "Account No: 0102-XXXXXX-01   Branch: Akbari Mandi, Lahore", font=font(18), fill=(60, 60, 60))
    d.text((30, 180), "Period: 01-Jan-2026 to 30-Jun-2026 (6 months)", font=font(18), fill=(60, 60, 60))

    headers = ["Month", "Deposits (PKR)", "Withdrawals (PKR)", "Closing (PKR)"]
    cols = [30, 240, 480, 700]
    y = 240
    for c, htxt in zip(cols, headers):
        d.text((c, y), htxt, font=font(18, True), fill=(0, 60, 130))
    months = [("Jan 2026", "395,000", "372,000", "88,000"),
              ("Feb 2026", "410,000", "385,000", "113,000"),
              ("Mar 2026", "452,000", "430,000", "135,000"),
              ("Apr 2026", "376,000", "391,000", "120,000"),
              ("May 2026", "428,000", "402,000", "146,000"),
              ("Jun 2026", "441,000", "419,000", "168,000")]
    y += 40
    for row in months:
        for c, cell in zip(cols, row):
            d.text((c, y), cell, font=font(18), fill=(30, 30, 30))
        y += 36
    d.line([30, y + 10, w - 30, y + 10], fill=(200, 200, 200), width=2)
    d.text((30, y + 30), "Average monthly deposits: PKR 417,000    Bounced cheques: 0", font=font(18, True), fill=(20, 20, 20))
    watermark(d, w, h)
    img.save(OUT / "bank_statement_specimen.png")


def make_utility_bill():
    w, h = 800, 1000
    img = Image.new("RGB", (w, h), (255, 253, 240))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w, 80], fill=(200, 120, 0))
    d.text((30, 40), "LESCO  Electricity Bill (SPECIMEN)", font=font(26, True), fill="white", anchor="lm")
    rows = [("Consumer Name", NAME), ("Address", ADDRESS), ("Reference No", "04-11223-XXXXXXX"),
            ("Billing Month", "June 2026"), ("Amount Payable", "PKR 18,450"), ("Due Date", "10-Jul-2026")]
    y = 130
    for label, value in rows:
        d.text((30, y), label, font=font(18), fill=(120, 90, 40))
        d.text((320, y), value, font=font(20, True), fill=(30, 30, 30))
        y += 54
    d.text((30, y + 20), "Payment history (last 6 months): PAID ON TIME x 6", font=font(20, True), fill=(20, 110, 40))
    watermark(d, w, h)
    img.save(OUT / "utility_bill_specimen.png")


if __name__ == "__main__":
    make_cnic()
    make_bank_statement()
    make_utility_bill()
    print("wrote:", ", ".join(p.name for p in OUT.glob("*_specimen.png")))
