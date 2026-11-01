export const RESELLER_PLANS = [
  {
    id: "weekly",
    badge: "Starter · អ្នកចាប់ផ្ដើម",
    name: "Weekly Plan",
    subName: "គម្រោង 7 ថ្ងៃ (សម្រាប់អ្នកចាប់ផ្ដើម)",
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
    badge: "Most Popular · ការពេញនិយមបំផុត",
    name: "Monthly VIP Plan",
    subName: "គម្រោង 30 ថ្ងៃ (ពេញនិយមបំផុត ចំណេញខ្ពស់)",
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
    badge: "Custom Storefront · Website ផ្ទាល់ខ្លួន",
    name: "Store Website Setup",
    subName: "រៀបចំគេហទំព័រ Top-Up ផ្ទាល់ខ្លួនលើ Domain របស់អ្នក",
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
