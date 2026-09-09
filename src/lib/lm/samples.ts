import compliantImg from "@/assets/sample-compliant.jpg";
import missingImg from "@/assets/sample-missing.jpg";
import suspiciousImg from "@/assets/sample-suspicious.jpg";

export interface SampleProduct {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  expectation: string;
  ocrConfidence: number;
  text: string;
}

export const SAMPLES: SampleProduct[] = [
  {
    id: "sample-compliant",
    title: "Crunchy Gold Biscuits – 200 g",
    subtitle: "Scenario 1 · Fully compliant package",
    image: compliantImg,
    expectation: "All mandatory declarations printed and legible",
    ocrConfidence: 94,
    text: `CRUNCHY GOLD
Glucose Biscuits
Manufactured by: Sunrise Foods Pvt Ltd
Plot 42, MIDC Industrial Estate, Pune, Maharashtra 411019
Net Weight: 200 g
MRP: Rs. 40.00 (inclusive of all taxes)
Mfg Date: 03/2026
Best Before: 9 months from packaging
Batch No: SF-2603-A17
Consumer Care: 1800 220 4455
Email: care@sunrisefoods.in
Country of Origin: India`,
  },
  {
    id: "sample-missing",
    title: "Namkeen Mix Pouch – 250 g",
    subtitle: "Scenario 2 · Missing mandatory information",
    image: missingImg,
    expectation: "Address, consumer care and batch details absent",
    ocrConfidence: 81,
    text: `SPICY TREAT
Namkeen Mix
Manufactured by: Treat Snacks
Net Qty: 250 g
MRP Rs 55
Mfg Date: 01/2026`,
  },
  {
    id: "sample-suspicious",
    title: "Fruit Drink Bottle – 1 Ltr",
    subtitle: "Scenario 3 · Suspicious MRP / quantity formatting",
    image: suspiciousImg,
    expectation: "Conflicting prices and a non-standard quantity string",
    ocrConfidence: 68,
    text: `FRESHO JUICE
Mixed Fruit Drink
Manufactured by: Fresho Beverages LLP
Survey 12, Ring Road, Nashik, Maharashtra 422009
Net Weight: 1 Ltrs
MRP 99
Maximum Retail Price: 120
Price 89/-
Packed on: 02/2026
Consumer Care: 98765
Batch: --`,
  },
];
