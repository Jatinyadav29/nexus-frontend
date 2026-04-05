import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const Register = () => {
  const container = useRef();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  useGSAP(
    () => {
      gsap.from(".gsap-reveal", {
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
      });
    },
    { scope: container },
  );

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    console.log("Registration Data:", formData);
    // Backend API integration will go here
  };

  return (
    <section
      ref={container}
      className="py-24 bg-linear-to-br from-gray-900 via-gray-800 to-black min-h-screen flex items-center"
    >
      <div className="container mx-auto px-6">
        <div className="gsap-reveal text-center mb-12">
          <h2 className="text-5xl font-extrabold mb-4 text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-pink-500">
            Register Now
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Join Nexus Gaming Cafe today and be part of our growing community!
          </p>
        </div>

        <div className="gsap-reveal max-w-xl mx-auto bg-gray-800/90 backdrop-blur-sm p-10 rounded-2xl shadow-2xl hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-300 mb-2 font-medium">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-purple-500 focus:ring focus:ring-purple-500/40 text-gray-200"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2 font-medium">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-purple-500 focus:ring focus:ring-purple-500/40 text-gray-200"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2 font-medium">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-purple-500 focus:ring focus:ring-purple-500/40 text-gray-200"
                placeholder="Enter your phone number"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2 font-medium">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-purple-500 focus:ring focus:ring-purple-500/40 text-gray-200"
                placeholder="Create a password"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2 font-medium">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:border-purple-500 focus:ring focus:ring-purple-500/40 text-gray-200"
                placeholder="Re-enter password"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8 py-3 rounded-lg text-lg font-semibold transition-transform transform hover:scale-105 shadow-lg"
            >
              Register
            </button>
          </form>

          <p className="text-gray-400 text-center mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-purple-400 hover:underline">
              Login here
            </Link>
          </p>
        </div>

        <div className="gsap-reveal text-center mt-6">
          <Link
            to="/"
            className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg text-white font-medium transition-transform transform hover:scale-105 shadow-md inline-block"
          >
            🏠 Go Home
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Register;
