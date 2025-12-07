declare module "*.css";

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: any) => void) => void;
  close: () => void;
}

interface Window {
  Razorpay?: new (options: any) => RazorpayInstance;
}