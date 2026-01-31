import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    q: "How long before I am logged out automatically?",
    a: "You will be logged out after 5 hours of inactivity for security. Always save your changes regularly and log in daily for best results.",
  },
  {
    q: "Can I restore deleted products, customers, or bills?",
    a: "Currently, deleted items cannot be restored. Please double-check before confirming deletions. Always verify customer information before deletion as it affects all linked transactions.",
  },
  {
    q: "How do I export reports and data?",
    a: "Go to the Reports, Expenses, or Products section, apply any filters needed, and click the 'Export' button. You can export as Excel or PDF formats. Customer lists and inventory can also be exported from their respective pages.",
  },
  {
    q: "Who can access the Settings and Staff Management pages?",
    a: "Only Administrators can access and edit system settings, manage staff, and configure permissions. Staff members have restricted access based on their role.",
  },
  {
    q: "How do split payments work?",
    a: "When completing a sale, select 'Split Payment' option. Enter the cash amount and UPI/card amount separately. The system will validate that the total matches the bill amount before completing the transaction.",
  },
  {
    q: "Can I save incomplete bills?",
    a: "Yes! Use the 'Save Cart' feature in POS to save incomplete bills. You can resume them later from the Saved Carts manager. This is useful for walk-in customers who need to step away.",
  },
  {
    q: "How do membership hours work?",
    a: "When a customer with an active membership starts a gaming session, the system automatically deducts hours from their membership balance. Membership hours are tracked in real-time and expire based on the membership duration.",
  },
  {
    q: "What happens if I delete a customer?",
    a: "Deleting a customer is permanent and cannot be undone. However, their transaction history and bills remain in the system for record-keeping. Only delete customers if absolutely necessary.",
  },
  {
    q: "How do I track cash in the vault?",
    a: "Use the Dashboard Vault tab or Cash Management page to add cash deposits, record withdrawals, and track bank deposits. The system maintains a complete transaction history for reconciliation.",
  },
  {
    q: "Can customers book stations online?",
    a: "Yes! Customers can book through the public booking page. Bookings can be paid online via PhonePe or marked as 'Pay at Venue'. All bookings appear in the Bookings management page.",
  },
  {
    q: "What if I need more help or encounter an issue?",
    a: "Contact Cuephoria Tech Support Line at +91 86676 37565 or email contact@cuephoria.in. You can also revisit this guide anytime from the sidebar menu. For urgent issues, call the support line immediately.",
  },
];

const HowToFAQ: React.FC = () => (
  <div className="bg-black/80 rounded-lg mt-8 border border-gamehaus-purple/30 shadow-lg shadow-gamehaus-purple/10 p-6">
    <h3 className="flex items-center gap-2 text-xl font-bold text-gamehaus-lightpurple mb-4">
      <HelpCircle className="h-5 w-5" />
      Frequently Asked Questions
    </h3>
    <Accordion type="single" collapsible className="space-y-2">
      {faqs.map((faq, idx) => (
        <AccordionItem key={faq.q} value={`faq-${idx}`} className="border-gamehaus-purple/20">
          <AccordionTrigger className="text-lg text-gamehaus-lightpurple py-3 hover:text-gamehaus-magenta transition-colors hover:bg-gamehaus-purple/5 rounded-lg px-3">
            {faq.q}
          </AccordionTrigger>
          <AccordionContent className="text-base px-3 py-2 text-white/90 leading-relaxed">
            {faq.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  </div>
);

export default HowToFAQ;
