export const RESELLER_PLANS = [
  {
    id: "weekly",
    badge: "Starter",
    name: "Weekly Plan",
    subName: "7 Days Seller Plan",
    price: 5,
    period: "7 Days",
    tagline: "Flexible 7-day access for short-term sellers.",
    popular: false,
    highlight: "Fixed Wholesale Rates",
    features: [
      "Fixed Wholesale Pricing",
      "Standard Customer Support",
      "Instant Balance Checkout",
      "Full Game Catalogue Access",
      "Automatic Delivery Queue"
    ],
    buttonText: "GET STARTED",
    actionType: "subscribe"
  },
  {
    id: "monthly",
    badge: "Most Popular",
    name: "Monthly VIP Plan",
    subName: "30 Days VIP Plan",
    price: 15,
    period: "30 Days",
    tagline: "Best value 30-day plan for full store access & max margins.",
    popular: true,
    highlight: "Maximum Margins + Priority VIP",
    features: [
      "Deepest Wholesale Pricing Tier",
      "Priority VIP Order Delivery (Top Queue)",
      "Direct Bakong KHQR Deposit",
      "Full Game Catalogue Access",
      "24/7 Priority Discord & Telegram Support",
      "Batch Order Processing"
    ],
    buttonText: "UPGRADE TO VIP",
    actionType: "subscribe"
  },
  {
    id: "storefront",
    badge: "Custom Storefront",
    name: "Store Website Setup",
    subName: "Custom Top-Up Website on Your Domain",
    price: "Custom",
    period: "One-Time Setup",
    tagline: "Custom storefront website built, branded & approved on your own domain.",
    popular: false,
    highlight: "Your Own Top-Up Business",
    features: [
      "Branded Custom Domain (yourname.com)",
      "Modern Storefront Design & Mobile Layout",
      "Integrated Wholesale Supplier API Rates",
      "Automated Bakong KHQR Instant Payment",
      "Telegram Order Notification Alerts",
      "Dedicated Admin Dashboard & Management"
    ],
    buttonText: "TELEGRAM CONCIERGE",
    actionType: "telegram",
    telegramUrl: "https://t.me/cheydev"
  }
];
