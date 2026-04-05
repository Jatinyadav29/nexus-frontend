import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const Login = () => {
  const container = useRef();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    remember: false,
  });

  useGSAP(
    () => {
      gsap.from(".gsap-reveal", {
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power3.out",
      });
    },
    { scope: container },
  );

  const handleChange = (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Login Data:", formData);
    // Backend API integration will go here
  };

  return (
    <section
      ref={container}
      className="py-32 bg-gray-900 min-h-screen flex items-center"
    >
      <div className="container mx-auto px-6">
        <div className="gsap-reveal text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 gradient-text">
            Welcome Back
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Login to continue your ultimate gaming experience.
          </p>
        </div>

        <div className="gsap-reveal max-w-2xl mx-auto bg-gray-800 p-8 rounded-xl shadow-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-300 mb-2 font-semibold">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2 font-semibold">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center text-gray-400 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  name="remember"
                  checked={formData.remember}
                  onChange={handleChange}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-700 rounded cursor-pointer"
                />
                <span className="ml-2">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-purple-500 hover:underline text-sm"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 hover-glow"
            >
              Login
            </button>
          </form>

          <p className="text-gray-400 text-center mt-6">
            Don’t have an account?{" "}
            <Link to="/register" className="text-purple-500 hover:underline">
              Register here
            </Link>
          </p>
        </div>

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

export default Login;
