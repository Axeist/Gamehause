import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Home,
  ShoppingCart,
  Clock,
  Package,
  Users,
  BarChart2,
  Calendar,
  Trophy,
  Users2,
  UserCircle,
  DollarSign,
  Wallet,
  Settings,
  BookOpen,
  CircleHelp,
  Receipt,
  CreditCard,
  TrendingUp,
} from "lucide-react";

const steps = [
  {
    title: "Dashboard - Overview & Analytics",
    icon: Home,
    detail: (
      <>
        <p className="mb-3 text-white/90 font-semibold">
          Your command center for real-time business insights and performance tracking.
        </p>
        <div className="space-y-4">
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Overview Tab
            </h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Real-time Statistics:</b> Today's sales, active sessions, new customers, and low stock alerts</li>
              <li><b>Active Sessions Tracker:</b> Monitor all gaming stations with live timers and customer details</li>
              <li><b>Recent Transactions:</b> Quick view of latest bills and payments</li>
              <li><b>Quick Actions:</b> Fast access to POS, Stations, Products, and other key features</li>
            </ul>
          </div>
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2 flex items-center gap-2">
              <BarChart2 className="h-4 w-4" />
              Analytics Tab
            </h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Sales Charts:</b> Hourly, daily, weekly, and monthly revenue trends with interactive graphs</li>
              <li><b>Customer Analytics:</b> Spending patterns, visit frequency, and customer activity correlations</li>
              <li><b>Product Performance:</b> Best-selling items, inventory turnover, and product revenue analysis</li>
              <li><b>Hourly Revenue Distribution:</b> Identify peak hours and optimize staffing</li>
              <li><b>Business Insights:</b> Compare current period with previous periods for growth tracking</li>
            </ul>
          </div>
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Expenses Tab
            </h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Expense Overview:</b> Total expenses, categorized breakdown, and expense trends</li>
              <li><b>Date Range Filtering:</b> Analyze expenses for specific periods</li>
              <li><b>Category Analysis:</b> Track spending by category (inventory, salary, utilities, rent, etc.)</li>
              <li><b>Profit & Loss:</b> Compare revenue vs expenses for net profit calculation</li>
              <li><b>Export Options:</b> Download expense reports as Excel for accounting</li>
            </ul>
          </div>
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2 flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Vault Tab
            </h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Cash Vault Management:</b> Track physical cash in vault with add/withdraw operations</li>
              <li><b>Bank Deposits:</b> Record bank deposits and maintain deposit history</li>
              <li><b>Transaction History:</b> Complete audit trail of all cash movements</li>
              <li><b>Cash Summary:</b> Real-time balance and reconciliation reports</li>
            </ul>
          </div>
        </div>
        <div className="block mt-4 p-3 rounded-lg bg-nerfturf-purple/10 border border-nerfturf-purple/30">
          <b className="text-nerfturf-lightpurple">Pro Tip:</b>
          <span className="ml-2 text-white/80">Use the Analytics tab to identify peak hours and optimize your operations. Export reports regularly for financial audits.</span>
        </div>
      </>
    ),
  },
  {
    title: "Point of Sale (POS) - Complete Billing System",
    icon: ShoppingCart,
    detail: (
      <>
        <p className="mb-3 text-white/90 font-semibold">
          Comprehensive billing system for products, gaming sessions, and customer transactions.
        </p>
        <div className="space-y-4">
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Creating Bills
            </h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Product Selection:</b> Browse by category (Food, Drinks, Tobacco, Challenges, Membership) or search by name</li>
              <li><b>Gaming Sessions:</b> Add hourly sessions for PS5, Pool, or VR stations directly to bills</li>
              <li><b>Customer Linking:</b> Attach customer to bill for loyalty tracking and automatic discount application</li>
              <li><b>Quantity Management:</b> Adjust quantities, remove items, or edit before checkout</li>
              <li><b>Saved Carts:</b> Save incomplete bills and resume later for walk-in customers</li>
            </ul>
          </div>
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Options
            </h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Cash Payment:</b> Standard cash transactions with change calculation</li>
              <li><b>UPI Payment:</b> Digital payments via UPI apps</li>
              <li><b>Card Payment:</b> Credit/debit card transactions</li>
              <li><b>Split Payment:</b> Accept multiple payment methods for a single bill (e.g., ₹500 cash + ₹300 UPI)</li>
              <li><b>Complimentary:</b> Mark bills as complimentary for special cases</li>
            </ul>
          </div>
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2 flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Discounts & Loyalty
            </h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Custom Discounts:</b> Apply percentage or fixed amount discounts (Admin only for price overrides)</li>
              <li><b>Loyalty Points:</b> Customers can redeem accumulated loyalty points</li>
              <li><b>Student Discount:</b> Apply student discounts for eligible customers</li>
              <li><b>Membership Benefits:</b> Automatic discounts for active members</li>
            </ul>
          </div>
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2 flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Receipt Management
            </h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Print Receipts:</b> Instant thermal or standard printing</li>
              <li><b>Download PDF:</b> Save receipts as PDF files</li>
              <li><b>Share Receipts:</b> Send receipts via WhatsApp or email</li>
              <li><b>Reprint History:</b> Access and reprint any past receipt from Reports page</li>
            </ul>
          </div>
        </div>
        <div className="block mt-4 p-3 rounded-lg bg-nerfturf-purple/10 border border-nerfturf-purple/30">
          <b className="text-nerfturf-lightpurple">Admin Note:</b>
          <span className="ml-2 text-white/80">Only admins can modify prices mid-sale or override discount limits. Staff can apply standard discounts and process payments.</span>
        </div>
      </>
    ),
  },
  {
    title: "Gaming Stations - Session Management",
    icon: Clock,
    detail: (
      <>
        <p className="mb-3 text-white/90 font-semibold">
          Manage all gaming stations (PS5, Pool Tables, VR) and track active sessions in real-time.
        </p>
        <ul className="list-disc ml-5 space-y-2 text-white/80">
          <li><b>Station Types:</b> Support for PlayStation 5, 8-Ball Pool Tables, and VR Gaming stations</li>
          <li><b>Live Status:</b> Visual indicators show Available (green) or Occupied (orange) status for each station</li>
          <li><b>Start Session:</b> Begin a gaming session by selecting station, customer, and hourly rate. Optional coupon codes can be applied</li>
          <li><b>End Session:</b> Stop sessions with automatic time calculation and billing integration</li>
          <li><b>Session Extension:</b> Add extra time to active sessions without ending them</li>
          <li><b>Station Management:</b> Add new stations, edit names, set hourly rates, and configure station types</li>
          <li><b>Session History:</b> View complete history of all sessions with customer details, duration, and revenue</li>
          <li><b>Real-time Timers:</b> Live countdown timers show remaining time for active sessions</li>
          <li><b>Auto-billing:</b> Sessions automatically convert to billable items in POS when ended</li>
        </ul>
        <div className="block mt-4 p-3 rounded-lg bg-nerfturf-purple/10 border border-nerfturf-purple/30">
          <b className="text-nerfturf-lightpurple">Tip:</b>
          <span className="ml-2 text-white/80">Use the Dashboard to see all active sessions at a glance. Session extensions appear as shortcuts while a station is active.</span>
        </div>
      </>
    ),
  },
  {
    title: "Products - Inventory Management",
    icon: Package,
    detail: (
      <>
        <p className="mb-3 text-white/90 font-semibold">
          Complete inventory control for all products, categories, pricing, and stock levels.
        </p>
        <div className="space-y-4">
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2">Product Management</h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Add Products:</b> Create items with name, price, category, stock level, and optional images</li>
              <li><b>Edit Products:</b> Update prices, stock, descriptions, and product details anytime</li>
              <li><b>Delete Products:</b> Remove discontinued items (Admin only for membership products)</li>
              <li><b>Bulk Operations:</b> Update multiple products at once for price changes or stock corrections</li>
            </ul>
          </div>
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2">Categories & Organization</h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Product Categories:</b> Organize into Food, Drinks, Tobacco, Challenges, Membership, and custom categories</li>
              <li><b>Category Management:</b> Add, rename, or remove categories as needed</li>
              <li><b>Filtering:</b> Quick filter by category in POS and Products page</li>
            </ul>
          </div>
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2">Stock Management</h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Stock Tracking:</b> Real-time inventory levels with automatic deduction on sales</li>
              <li><b>Low Stock Alerts:</b> Automatic notifications when products fall below threshold (default: 5 units)</li>
              <li><b>Stock Updates:</b> Manually adjust stock levels for restocking or corrections</li>
              <li><b>Stock History:</b> Track stock movements and changes over time</li>
            </ul>
          </div>
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2">Advanced Features</h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Product Images:</b> Upload images for visual catalog and better POS identification</li>
              <li><b>Pricing Options:</b> Set buying cost and selling price for profit margin tracking</li>
              <li><b>Offer Prices:</b> Configure promotional pricing for special offers</li>
              <li><b>Export Inventory:</b> Download complete product list as Excel for audits</li>
            </ul>
          </div>
        </div>
        <div className="block mt-4 p-3 rounded-lg bg-nerfturf-purple/10 border border-nerfturf-purple/30">
          <b className="text-nerfturf-lightpurple">Important:</b>
          <span className="ml-2 text-white/80">Only Admins can delete products or modify membership products. Keep stock levels updated for accurate inventory tracking.</span>
        </div>
      </>
    ),
  },
  {
    title: "Customers - Member & Guest Management",
    icon: Users,
    detail: (
      <>
        <p className="mb-3 text-white/90 font-semibold">
          Comprehensive customer database with loyalty tracking, membership management, and purchase history.
        </p>
        <div className="space-y-4">
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2">Customer Registration</h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Add Customers:</b> Register new customers with name, phone, email, and customer type</li>
              <li><b>Customer Types:</b> Classify as Member, Regular, or Guest for different service levels</li>
              <li><b>Quick Search:</b> Fast lookup by name or phone number in POS and Customers page</li>
            </ul>
          </div>
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2">Customer Profiles</h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Purchase History:</b> Complete transaction history with all bills and receipts</li>
              <li><b>Session History:</b> Track all gaming sessions played by the customer</li>
              <li><b>Total Spending:</b> Lifetime spending and average transaction value</li>
              <li><b>Loyalty Points:</b> Current points balance and redemption history</li>
              <li><b>Membership Status:</b> Active membership details, hours remaining, and validity</li>
            </ul>
          </div>
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2">Membership Management</h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Membership Plans:</b> Create weekly or monthly membership plans with allocated hours</li>
              <li><b>Membership Activation:</b> Activate memberships with start date and duration</li>
              <li><b>Hours Tracking:</b> Automatic deduction of membership hours when sessions are started</li>
              <li><b>Membership Renewal:</b> Extend or renew memberships before expiration</li>
              <li><b>Validity Check:</b> System automatically validates membership before applying discounts</li>
            </ul>
          </div>
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2">Loyalty Program</h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Points Accumulation:</b> Customers earn points on purchases (configurable rate)</li>
              <li><b>Points Redemption:</b> Customers can redeem points for discounts during checkout</li>
              <li><b>Points History:</b> Track all points earned and redeemed</li>
            </ul>
          </div>
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2">Customer Management</h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Edit Information:</b> Update customer details, contact information, and preferences</li>
              <li><b>Delete Customers:</b> Remove customer records (permanent - cannot be restored)</li>
              <li><b>Export Lists:</b> Download customer database for marketing campaigns</li>
              <li><b>Filtering:</b> Filter by customer type, membership status, or search by name/phone</li>
            </ul>
          </div>
        </div>
        <div className="block mt-4 p-3 rounded-lg bg-nerfturf-purple/10 border border-nerfturf-purple/30">
          <b className="text-nerfturf-lightpurple">Warning:</b>
          <span className="ml-2 text-white/80">Deleted customers cannot be restored. Always verify before deletion. Customer data is linked to all their transactions and sessions.</span>
        </div>
      </>
    ),
  },
  {
    title: "Reports - Analytics & Financial Reports",
    icon: BarChart2,
    detail: (
      <>
        <p className="mb-3 text-white/90 font-semibold">
          Comprehensive reporting system for sales, sessions, products, and financial analysis.
        </p>
        <div className="space-y-4">
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2">Sales Reports</h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Date Range Filtering:</b> Analyze sales for specific periods (daily, weekly, monthly, custom)</li>
              <li><b>Payment Method Breakdown:</b> View sales by Cash, UPI, Card, or Split payments</li>
              <li><b>Product-wise Sales:</b> Identify best-selling items and revenue by product</li>
              <li><b>Category Analysis:</b> Sales breakdown by product categories</li>
              <li><b>Staff Performance:</b> Track sales by staff member (Admin only)</li>
            </ul>
          </div>
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2">Bill Details</h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Bill Drilldown:</b> Click any bill to view complete details, items, and payment information</li>
              <li><b>Receipt Reprint:</b> Reprint any receipt directly from the reports page</li>
              <li><b>Bill Editing:</b> Update bill details or payment methods (Admin only)</li>
              <li><b>Bill Deletion:</b> Remove incorrect bills with proper authorization</li>
            </ul>
          </div>
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2">Session Reports</h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Station Activity:</b> Track usage and revenue by gaming station</li>
              <li><b>Peak Hours Analysis:</b> Identify busiest times for each station type</li>
              <li><b>Session Revenue:</b> Total revenue from gaming sessions</li>
              <li><b>Customer Session History:</b> View all sessions for specific customers</li>
            </ul>
          </div>
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2">Export & Sharing</h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Excel Export:</b> Download reports as Excel files for accounting and analysis</li>
              <li><b>PDF Reports:</b> Generate PDF reports for official records</li>
              <li><b>GST Reports:</b> Export data formatted for GST filing and tax audits</li>
              <li><b>Profit & Loss:</b> Combine sales and expenses for comprehensive P&L reports</li>
            </ul>
          </div>
        </div>
        <div className="block mt-4 p-3 rounded-lg bg-nerfturf-purple/10 border border-nerfturf-purple/30">
          <b className="text-nerfturf-lightpurple">Pro Tip:</b>
          <span className="ml-2 text-white/80">Export reports regularly for backup. Use date filters to compare performance across different periods. Admin users can access detailed profit/loss figures.</span>
        </div>
      </>
    ),
  },
  {
    title: "Bookings - Reservation Management",
    icon: Calendar,
    detail: (
      <>
        <p className="mb-3 text-white/90 font-semibold">
          Manage table and station reservations, advance bookings, and customer appointments.
        </p>
        <ul className="list-disc ml-5 space-y-2 text-white/80">
          <li><b>Create Bookings:</b> Set up reservations with customer name, station type, date, time slot, and duration</li>
          <li><b>Calendar View:</b> Visual calendar interface to see all bookings at a glance</li>
          <li><b>List View:</b> Detailed list view with filters for date, station, and status</li>
          <li><b>Booking Status:</b> Track bookings as Confirmed, In-Progress, Completed, Cancelled, or No-Show</li>
          <li><b>Time Slot Management:</b> View available time slots and prevent double-booking</li>
          <li><b>Customer Integration:</b> Link bookings to customer profiles for history tracking</li>
          <li><b>Edit Bookings:</b> Update booking details, change time slots, or modify customer information</li>
          <li><b>Cancel Bookings:</b> Cancel reservations with automatic slot release</li>
          <li><b>Booking History:</b> Complete archive of all past bookings and their outcomes</li>
          <li><b>Public Booking Page:</b> Customers can book directly through the public booking portal</li>
          <li><b>Payment Integration:</b> Online payment options via PhonePe for advance bookings</li>
          <li><b>Confirmation System:</b> Send booking confirmations via SMS or WhatsApp</li>
        </ul>
        <div className="block mt-4 p-3 rounded-lg bg-nerfturf-purple/10 border border-nerfturf-purple/30">
          <b className="text-nerfturf-lightpurple">Tip:</b>
          <span className="ml-2 text-white/80">Use the "New Booking" button to open the public booking page. Set booking policies and deposit requirements in Settings.</span>
        </div>
      </>
    ),
  },
  {
    title: "Tournaments - Event Management",
    icon: Trophy,
    detail: (
      <>
        <p className="mb-3 text-white/90 font-semibold">
          Organize and manage gaming tournaments, competitions, and special events.
        </p>
        <ul className="list-disc ml-5 space-y-2 text-white/80">
          <li><b>Create Tournaments:</b> Set up tournaments with name, game type (Pool, PS5, VR), date, and format</li>
          <li><b>Tournament Formats:</b> Support for Knockout, Round-Robin, and custom formats</li>
          <li><b>Player Registration:</b> Register participants with customer linking for history tracking</li>
          <li><b>Match Generation:</b> Automatic bracket and match generation based on tournament format</li>
          <li><b>Match Management:</b> Record match results, update scores, and track tournament progress</li>
          <li><b>Tournament History:</b> Complete archive of all past tournaments with results and winners</li>
          <li><b>Public Tournament Page:</b> Display upcoming tournaments on public-facing page</li>
          <li><b>Tournament Images:</b> Upload promotional images for tournaments</li>
          <li><b>Status Tracking:</b> Manage tournament status (Upcoming, In-Progress, Completed, Cancelled)</li>
        </ul>
        <div className="block mt-4 p-3 rounded-lg bg-nerfturf-purple/10 border border-nerfturf-purple/30">
          <b className="text-nerfturf-lightpurple">Note:</b>
          <span className="ml-2 text-white/80">Tournaments can be managed from the Settings page. Public tournament listings help promote events to customers.</span>
        </div>
      </>
    ),
  },
  {
    title: "Expenses - Cost Tracking",
    icon: DollarSign,
    detail: (
      <>
        <p className="mb-3 text-white/90 font-semibold">
          Track all business expenses for accurate profit calculation and financial management.
        </p>
        <div className="space-y-4">
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2">Expense Categories</h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Inventory:</b> Stock purchases and supplies</li>
              <li><b>Salary:</b> Payroll, bonuses, and staff advances</li>
              <li><b>Utilities:</b> Electricity, water, mobile/data, generator fuel</li>
              <li><b>Rent:</b> Property rent, deposits, and agreement costs</li>
              <li><b>Marketing:</b> Advertising, printing, banners, and promotional materials</li>
              <li><b>Maintenance:</b> Repairs, cleaning, lighting, and furniture</li>
              <li><b>Transport:</b> Logistics and delivery costs</li>
              <li><b>Subscriptions:</b> SaaS tools, app subscriptions, and software licenses</li>
              <li><b>Events:</b> Tournament prizes, trophies, and event expenses</li>
              <li><b>Bank Charges:</b> EMI, fees, and financial charges</li>
              <li><b>Withdrawal:</b> Partner/owner drawings</li>
              <li><b>Other:</b> Miscellaneous expenses</li>
            </ul>
          </div>
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2">Expense Management</h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Add Expenses:</b> Record expenses with amount, category, date, and notes</li>
              <li><b>Recurring Expenses:</b> Mark expenses as one-time, monthly, quarterly, or yearly</li>
              <li><b>Edit/Delete:</b> Update expense details or remove incorrect entries</li>
              <li><b>Date Filtering:</b> Filter expenses by date range for period analysis</li>
              <li><b>Category Filtering:</b> View expenses by category for budget tracking</li>
            </ul>
          </div>
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2">Reports & Analysis</h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Expense Summary:</b> Total expenses, category-wise breakdown, and trends</li>
              <li><b>Profit & Loss:</b> Compare expenses with revenue for net profit calculation</li>
              <li><b>Export Reports:</b> Download expense reports as Excel for accounting</li>
              <li><b>Dashboard Integration:</b> View expense summaries in Dashboard Expenses tab</li>
            </ul>
          </div>
        </div>
        <div className="block mt-4 p-3 rounded-lg bg-nerfturf-purple/10 border border-nerfturf-purple/30">
          <b className="text-nerfturf-lightpurple">Tip:</b>
          <span className="ml-2 text-white/80">Be diligent with expense categorization. Well-organized expenses make monthly summaries and tax filing much easier. Regular expense tracking helps identify cost-saving opportunities.</span>
        </div>
      </>
    ),
  },
  {
    title: "Cash Vault - Cash Management",
    icon: Wallet,
    detail: (
      <>
        <p className="mb-3 text-white/90 font-semibold">
          Track physical cash in vault, bank deposits, and maintain complete cash flow records.
        </p>
        <ul className="list-disc ml-5 space-y-2 text-white/80">
          <li><b>Vault Balance:</b> Real-time tracking of cash in physical vault</li>
          <li><b>Add Cash:</b> Record cash deposits into vault from daily sales</li>
          <li><b>Withdraw Cash:</b> Record cash withdrawals for expenses or bank deposits</li>
          <li><b>Bank Deposits:</b> Record bank deposits with date, amount, and reference number</li>
          <li><b>Transaction History:</b> Complete audit trail of all cash movements</li>
          <li><b>Cash Summary:</b> View current balance, total deposits, withdrawals, and bank deposits</li>
          <li><b>Reconciliation:</b> Match vault balance with expected cash from sales</li>
          <li><b>Dashboard Integration:</b> Access vault management from Dashboard Vault tab</li>
        </ul>
        <div className="block mt-4 p-3 rounded-lg bg-nerfturf-purple/10 border border-nerfturf-purple/30">
          <b className="text-nerfturf-lightpurple">Important:</b>
          <span className="ml-2 text-white/80">Regular vault reconciliation ensures cash accuracy. Record all cash movements immediately to maintain accurate records. Bank deposits should match actual bank statements.</span>
        </div>
      </>
    ),
  },
  {
    title: "Staff Management - Team Administration",
    icon: Users2,
    detail: (
      <>
        <p className="mb-3 text-white/90 font-semibold">
          Manage staff members, roles, permissions, and access controls (Admin only).
        </p>
        <ul className="list-disc ml-5 space-y-2 text-white/80">
          <li><b>Add Staff:</b> Create staff accounts with name, email, phone, and role assignment</li>
          <li><b>Role Management:</b> Assign roles as Admin or Staff with appropriate permissions</li>
          <li><b>Permission Control:</b> Restrict staff access to sensitive features (discounts, reports, settings)</li>
          <li><b>Edit Staff:</b> Update staff information, change roles, or modify permissions</li>
          <li><b>Remove Staff:</b> Deactivate or remove staff accounts when needed</li>
          <li><b>Staff Activity:</b> Track staff performance and sales (Admin only)</li>
          <li><b>Login Management:</b> Monitor staff logins and session activity</li>
        </ul>
        <div className="block mt-4 p-3 rounded-lg bg-nerfturf-purple/10 border border-nerfturf-purple/30">
          <b className="text-nerfturf-lightpurple">Admin Only:</b>
          <span className="ml-2 text-white/80">Only administrators can access Staff Management. Staff members see "My Portal" instead for their personal dashboard and statistics.</span>
        </div>
      </>
    ),
  },
  {
    title: "Staff Portal - Personal Dashboard",
    icon: UserCircle,
    detail: (
      <>
        <p className="mb-3 text-white/90 font-semibold">
          Personal dashboard for staff members to track their performance and activities.
        </p>
        <ul className="list-disc ml-5 space-y-2 text-white/80">
          <li><b>Personal Statistics:</b> View your sales, transactions, and performance metrics</li>
          <li><b>Session Tracking:</b> Monitor sessions you've started and managed</li>
          <li><b>Today's Activity:</b> Quick summary of your work for the current day</li>
          <li><b>Performance Trends:</b> Track your performance over time</li>
        </ul>
        <div className="block mt-4 p-3 rounded-lg bg-nerfturf-purple/10 border border-nerfturf-purple/30">
          <b className="text-nerfturf-lightpurple">Note:</b>
          <span className="ml-2 text-white/80">Staff Portal is only visible to non-admin users. Admins use the main Dashboard for comprehensive business overview.</span>
        </div>
      </>
    ),
  },
  {
    title: "Settings - System Configuration",
    icon: Settings,
    detail: (
      <>
        <p className="mb-3 text-white/90 font-semibold">
          Complete system configuration and customization (Admin only).
        </p>
        <div className="space-y-4">
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2">Business Settings</h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Club Information:</b> Set business name, address, contact details, and GSTIN</li>
              <li><b>Branding:</b> Upload logo, customize colors, and set theme preferences</li>
              <li><b>Contact Information:</b> Update phone numbers, email, and support details</li>
            </ul>
          </div>
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2">Tournament Management</h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Create Tournaments:</b> Set up new tournaments with all details</li>
              <li><b>Tournament Images:</b> Upload and manage promotional images</li>
              <li><b>Public Tournament Page:</b> Configure public-facing tournament listings</li>
            </ul>
          </div>
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2">Security & Access</h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>PIN Management:</b> Update admin PIN and configure PIN requirements</li>
              <li><b>Auto-logout:</b> Configure automatic logout after inactivity (default: 5 hours)</li>
              <li><b>Access Control:</b> Set permissions for different user roles</li>
            </ul>
          </div>
          <div>
            <h4 className="text-nerfturf-lightpurple font-semibold mb-2">Data Management</h4>
            <ul className="list-disc ml-5 space-y-1 text-white/80">
              <li><b>Backup Data:</b> Download complete data backup for safekeeping</li>
              <li><b>Restore Data:</b> Restore from backup if needed</li>
              <li><b>Data Export:</b> Export all data in various formats</li>
            </ul>
          </div>
        </div>
        <div className="block mt-4 p-3 rounded-lg bg-nerfturf-purple/10 border border-nerfturf-purple/30">
          <b className="text-nerfturf-lightpurple">Admin Only:</b>
          <span className="ml-2 text-white/80">Only administrators can access and modify Settings. Staff members have restricted access based on their role permissions.</span>
        </div>
      </>
    ),
  },
  {
    title: "Help & Support - Getting Assistance",
    icon: CircleHelp,
    detail: (
      <>
        <p className="mb-3 text-white/90 font-semibold">
          Resources and support channels for getting help with the system.
        </p>
        <ul className="list-disc ml-5 space-y-2 text-white/80">
          <li><b>How to Use Guide:</b> This comprehensive guide is always accessible from the sidebar menu</li>
          <li><b>Tooltips & Hints:</b> Hover over buttons and icons throughout the app for quick explanations</li>
          <li><b>In-App Help:</b> Contextual help available on most pages</li>
          <li><b>Training Resources:</b> Use this guide for staff training and onboarding</li>
          <li><b>Support Contact:</b> For any issues or questions, contact <b className="text-nerfturf-lightpurple">Cuephoria Tech Support Line: <a href="tel:+918667637565" className="underline text-nerfturf-magenta hover:text-nerfturf-lightpurple">+91 86676 37565</a></b></li>
          <li><b>Email Support:</b> Reach out via <a href="mailto:contact@cuephoria.in" className="underline text-nerfturf-magenta hover:text-nerfturf-lightpurple">contact@cuephoria.in</a></li>
          <li><b>Feature Updates:</b> New features and improvements are documented in this guide</li>
        </ul>
        <div className="block mt-4 p-3 rounded-lg bg-nerfturf-purple/10 border border-nerfturf-purple/30">
          <b className="text-nerfturf-lightpurple">Remember:</b>
          <span className="ml-2 text-white/80">You can revisit this guide anytime from the sidebar. Share it with new staff members for training. For urgent issues, contact Cuephoria Tech Support Line immediately.</span>
        </div>
      </>
    ),
  },
];

const HowToAccordion: React.FC = () => (
  <Accordion type="multiple" className="rounded-lg overflow-hidden shadow-inner border border-nerfturf-purple/30 bg-black/80">
    {steps.map((step, idx) => (
      <AccordionItem key={step.title} value={`item-${idx}`} className="border-nerfturf-purple/20">
        <AccordionTrigger className="flex gap-2 items-center px-4 py-3 text-lg font-semibold rounded-sm hover:bg-nerfturf-purple/10 focus:bg-nerfturf-purple/15 transition-all text-white">
          <step.icon className="h-5 w-5 text-nerfturf-lightpurple flex-shrink-0" />
          <span>{step.title}</span>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-5 text-base text-white/90 leading-normal">
          {step.detail}
        </AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
);

export default HowToAccordion;
