import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const Contact = () => {
  const container = useRef();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  useGSAP(
    () => {
      gsap.from(".gsap-reveal", {
        scale: 0.9,
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "back.out(1.2)",
      });
    },
    { scope: container },
  );

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Message Sent:", formData);
    alert("Message sent successfully (Frontend Demo)!");
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <section ref={container} className="py-32 bg-gray-900 min-h-screen">
      <div className="container mx-auto px-6 max-w-3xl flex flex-col justify-center h-full">
        <div className="gsap-reveal text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 gradient-text">
            Get in Touch
          </h2>
          <p className="text-gray-400">
            Have questions? We'd love to hear from you.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="gsap-reveal space-y-6 bg-gray-800 p-8 rounded-xl shadow-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all"
        >
          <div>
            <label className="block text-gray-400 mb-2">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none text-white"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none text-white"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-2">Message</label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none text-white"
              rows="4"
            ></textarea>
          </div>
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 w-full px-8 py-3 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 hover-glow"
          >
            Send Message
          </button>
        </form>

        <div className="gsap-reveal text-center mt-6">
          <Link
            to="/"
            className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg text-white font-semibold transition-all transform hover:scale-105 shadow-md inline-block"
          >
            🏠 Go Home
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Contact;
