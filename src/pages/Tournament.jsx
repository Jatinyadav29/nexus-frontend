import { useState, useRef, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { AuthContext } from "../context/AuthContext";

gsap.registerPlugin(useGSAP);

const Tournament = () => {
  const container = useRef();
  const navigate = useNavigate();

  // ✅ Sahi tareeka: Context hamesha component ke ANDAR hona chahiye!
  const { currUser } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    teamName: "",
    captainName: "",
    captainEmail: "",
    captainPhone: "",
    members: "",
  });

  // ✅ Agar user logged in hai, toh uska data automatically captain details me bhar do
  useEffect(() => {
    if (currUser) {
      setFormData((prev) => ({
        ...prev,
        captainName: currUser.username || "",
        captainEmail: currUser.email || "",
        captainPhone: currUser.phone || "",
      }));
    }
  }, [currUser]);

  useGSAP(
    () => {
      // Banner and Form elements staggered reveal
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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        "http://localhost:3005/api/tournament/register",
        formData,
      );
      if (response.data.success) {
        alert("🔥 " + response.data.message);
        navigate("/tournament/list");
      }
    } catch (error) {
      alert(
        error.response?.data?.message ||
          "Registration Failed. Please try again.",
      );
    }
  };

  return (
    <section ref={container} className="py-32 bg-gray-900 min-h-screen">
      <div className="container mx-auto px-6 max-w-3xl bg-gray-800/60 backdrop-blur-lg border border-gray-700/50 p-8 rounded-2xl shadow-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
        {/* Tournament Info */}
        <div className="text-center mb-8">
          <img
            src="https://images.wallpapersden.com/image/download/iso-valorant-x-overwatch-2-style_bmZsbWiUmZqaraWkpJRobWllrWdma2U.jpg"
            alt="Tournament Banner"
            className="gsap-reveal w-full h-64 object-cover rounded-xl mb-6 shadow-md hover:opacity-95 transition-all hover:scale-[1.01]"
          />
          <h2 className="gsap-reveal text-3xl font-bold gradient-text">
            🔥 Valorant Championship
          </h2>
          <p className="gsap-reveal text-gray-400 mt-2">
            💰{" "}
            <span className="font-semibold text-purple-400">
              Prize Pool: $5,000
            </span>
          </p>
          <p className="gsap-reveal text-gray-400">
            📅 June 15, 2026 | 🕑 2:00 PM EST
          </p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="gsap-reveal">
            <label className="block text-gray-300 mb-2 font-semibold">
              📝 Team Name
            </label>
            <input
              type="text"
              name="teamName"
              value={formData.teamName}
              onChange={handleChange}
              required
              className="w-full bg-gray-900/60 border border-gray-700/50 rounded-xl px-4 py-2 focus:border-purple-500 focus:outline-none text-white"
              placeholder="Enter your team name"
            />
          </div>

          <div className="gsap-reveal">
            <label className="block text-gray-300 mb-2 font-semibold">
              👑 Captain Name
            </label>
            <input
              type="text"
              name="captainName"
              value={formData.captainName}
              onChange={handleChange}
              required
              className="w-full bg-gray-900/60 border border-gray-700/50 rounded-xl px-4 py-2 focus:border-purple-500 focus:outline-none text-white"
              placeholder="Team captain's name"
            />
          </div>

          <div className="gsap-reveal">
            <label className="block text-gray-300 mb-2 font-semibold">
              📧 Email
            </label>
            <input
              type="email"
              name="captainEmail"
              value={formData.captainEmail}
              onChange={handleChange}
              required
              className="w-full bg-gray-900/60 border border-gray-700/50 rounded-xl px-4 py-2 focus:border-purple-500 focus:outline-none text-white"
              placeholder="Enter your email"
            />
          </div>

          <div className="gsap-reveal">
            <label className="block text-gray-300 mb-2 font-semibold">
              📞 Phone
            </label>
            <input
              type="tel"
              name="captainPhone"
              value={formData.captainPhone}
              onChange={handleChange}
              required
              className="w-full bg-gray-900/60 border border-gray-700/50 rounded-xl px-4 py-2 focus:border-purple-500 focus:outline-none text-white"
              placeholder="Enter your phone number"
            />
          </div>

          <div className="gsap-reveal">
            <label className="block text-gray-300 mb-2 font-semibold">
              👥 Team Members
            </label>
            <input
              type="text"
              name="members"
              value={formData.members}
              onChange={handleChange}
              placeholder="e.g. Jason, Jatin, Rohit"
              className="w-full bg-gray-900/60 border border-gray-700/50 rounded-xl px-4 py-2 focus:border-purple-500 focus:outline-none text-white"
            />
          </div>

          <button
            type="submit"
            className="gsap-reveal w-full bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-xl text-lg font-semibold transition-all transform hover:scale-105 hover-glow"
          >
            🚀 Register Team
          </button>
        </form>

        <div className="gsap-reveal text-center mt-6">
          <Link
            to="/"
            className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-xl text-white font-semibold transition-all transform hover:scale-105 shadow-md inline-block"
          >
            🏠 Go Home
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Tournament;
