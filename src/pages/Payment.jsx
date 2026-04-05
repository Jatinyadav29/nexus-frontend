import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const Payment = () => {
  const container = useRef();
  const [formData, setFormData] = useState({
    cardName: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
    amount: "",
  });

  useGSAP(
    () => {
      gsap.from(".gsap-reveal", {
        y: 50,
        opacity: 0,
        duration: 0.8,
        ease: "power2.out",
        stagger: 0.1,
      });
    },
    { scope: container },
  );

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePayment = (e) => {
    e.preventDefault();
    alert(
      `Processing fake payment of $${formData.amount} for ${formData.cardName}...`,
    );
    console.log("Payment Info:", formData);
  };

  return (
    <section
      ref={container}
      className="py-32 bg-gray-900 min-h-screen flex items-center"
    >
      <div className="container mx-auto px-6 max-w-lg">
        <div className="gsap-reveal bg-gray-800 p-8 rounded-xl shadow-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
          <h2 className="text-3xl font-bold mb-6 gradient-text text-center">
            Payment Portal
          </h2>
          <p className="text-gray-400 mb-8 text-center">
            Complete your payment securely.
            <br />
            <span className="text-sm">
              (This is a demo page, no real payment will be processed.)
            </span>
          </p>

          <form onSubmit={handlePayment} className="space-y-6">
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">
                Cardholder Name
              </label>
              <input
                type="text"
                name="cardName"
                value={formData.cardName}
                onChange={handleChange}
                required
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none text-white"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2 font-semibold">
                Card Number
              </label>
              <input
                type="text"
                name="cardNumber"
                value={formData.cardNumber}
                onChange={handleChange}
                required
                maxLength="16"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none text-white tracking-widest"
                placeholder="1234 5678 9012 3456"
              />
            </div>

            <div className="flex space-x-4">
              <div className="flex-1">
                <label className="block text-gray-300 mb-2 font-semibold">
                  Expiry Date
                </label>
                <input
                  type="text"
                  name="expiry"
                  value={formData.expiry}
                  onChange={handleChange}
                  required
                  maxLength="5"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none text-white"
                  placeholder="MM/YY"
                />
              </div>
              <div className="flex-1">
                <label className="block text-gray-300 mb-2 font-semibold">
                  CVV
                </label>
                <input
                  type="password"
                  name="cvv"
                  value={formData.cvv}
                  onChange={handleChange}
                  required
                  maxLength="3"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none text-white"
                  placeholder="123"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 mb-2 font-semibold">
                Amount
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                required
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none text-white"
                placeholder="1000"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 hover-glow"
            >
              Pay Now
            </button>

            <Link
              to="/"
              className="block text-center mt-4 text-purple-400 hover:underline"
            >
              ← Back to Home
            </Link>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Payment;
