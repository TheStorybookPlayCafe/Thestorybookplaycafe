import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { date, slot, baby, child, adult } = req.body || {};

    const b = Number(baby || 0);
    const c = Number(child || 0);
    const a = Number(adult || 0);

    const kids = b + c;

    // Enforce your booking rules server-side too (important)
    if (!date) return res.status(400).json({ error: "Missing date" });
    if (!slot) return res.status(400).json({ error: "Missing slot" });
    if (a < 1) return res.status(400).json({ error: "At least 1 adult is required." });
    if (kids < 1) return res.status(400).json({ error: "At least 1 child is required." });
    if (kids > 16) return res.status(400).json({ error: "Max 16 children per session." });

    // Prices in pence (GBP)
    const PRICE_BABY = 400;   // £4.00
    const PRICE_CHILD = 760;  // £7.60
    const PRICE_ADULT = 200;  // £2.00

    const line_items = [];
    if (b > 0) line_items.push({
      quantity: b,
      price_data: { currency: "gbp", unit_amount: PRICE_BABY, product_data: { name: "Child (0–12 months)" } }
    });
    if (c > 0) line_items.push({
      quantity: c,
      price_data: { currency: "gbp", unit_amount: PRICE_CHILD, product_data: { name: "Child (1–8 years)" } }
    });
    if (a > 0) line_items.push({
      quantity: a,
      price_data: { currency: "gbp", unit_amount: PRICE_ADULT, product_data: { name: "Adult" } }
    });

    const origin = req.headers.origin || `https://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${origin}/success.html`,
      cancel_url: `${origin}/booking.html`,
      metadata: {
        booking_date: String(date),
        booking_slot: String(slot),
        baby: String(b),
        child: String(c),
        adult: String(a),
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Server error" });
  }
}
