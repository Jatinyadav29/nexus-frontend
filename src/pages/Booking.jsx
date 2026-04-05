import { useState, useContext, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { AuthContext } from "../context/AuthContext";

gsap.registerPlugin(useGSAP);

const Booking = () => {
  const container = useRef();
  const navigate = useNavigate();

  // 1. Context hamesha component ke ANDAR!
  const { currUser } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    bookingType: "PC",
    membersCount: 1,
    membersName: "",
    bookingTimeStart: "",
    bookingTimeEnd: "",
  });

  // 2. Agar user logged in hai, toh uska data auto-fill kar do
  useEffect(() => {
    if (currUser) {
      setFormData((prev) => ({
        ...prev,
        name: currUser.username || "",
        email: currUser.email || "",
        phone: currUser.phone || "",
      }));
    }
  }, [currUser]);

  // 3. GSAP Animations
  // useGSAP(
  //   () => {
  //     gsap.from(".gsap-reveal", {
  //       y: 40,
  //       opacity: 0,
  //       duration: 0.8,
  //       stagger: 0.1,
  //       ease: "power3.out",
  //     });
  //   },
  //   { scope: container },
  // );

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // API call to Backend
      const response = await axios.post(
        "http://localhost:3005/api/bookings",
        formData,
      );

      if (response.data.success) {
        alert("🎮 " + response.data.message);
        navigate("/bookings"); // Redirect to booking list
      }
    } catch (error) {
      // Shows your custom backend error (e.g. "Overlapping time")
      alert(
        error.response?.data?.message || "Booking failed! Please try again.",
      );
    }
  };

  return (
    <div
      ref={container}
      className="min-h-screen flex items-center justify-center bg-gray-900 py-32"
    >
      <div className="gsap-reveal w-full max-w-2xl bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-700 transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]">
        {/* Title */}
        <h1 className="text-3xl font-bold text-center mb-8 text-purple-400">
          🎮 Book Your Gaming Experience
        </h1>

        {/* Booking Form */}
        <form onSubmit={handleSubmit} className="space-y-6 text-gray-300">
          <div className="gsap-reveal">
            <label className="block mb-2 font-semibold text-white">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
            />
          </div>

          <div className="gsap-reveal">
            <label className="block mb-2 font-semibold text-white">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
            />
          </div>

          <div className="gsap-reveal">
            <label className="block mb-2 font-semibold text-white">
              Phone Number
            </label>
            <input
              type="text"
              name="phone"
              pattern="\d{10}"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="10-digit number"
              className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
            />
          </div>

          <div className="gsap-reveal">
            <label className="block mb-2 font-semibold text-white">
              Booking Type
            </label>
            <select
              name="bookingType"
              value={formData.bookingType}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
            >
              <option value="PC">Gaming PC</option>
              <option value="VR">VR Experience</option>
            </select>
          </div>

          <div className="gsap-reveal">
            <label className="block mb-2 font-semibold text-white">
              Number of Members
            </label>
            <input
              type="number"
              name="membersCount"
              value={formData.membersCount}
              onChange={handleChange}
              min="1"
              className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
            />
          </div>

          <div className="gsap-reveal">
            <label className="block mb-2 font-semibold text-white">
              Members Names (comma separated)
            </label>
            <input
              type="text"
              name="membersName"
              value={formData.membersName}
              onChange={handleChange}
              placeholder="e.g. John, Sarah, Alex"
              className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
            />
          </div>

          <div className="gsap-reveal grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-semibold text-white">
                Start Time
              </label>
              <input
                type="datetime-local"
                name="bookingTimeStart"
                value={formData.bookingTimeStart}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
              />
            </div>
            <div>
              <label className="block mb-2 font-semibold text-white">
                End Time
              </label>
              <input
                type="datetime-local"
                name="bookingTimeEnd"
                value={formData.bookingTimeEnd}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
              />
            </div>
          </div>

          <div className="gsap-reveal text-center pt-4">
            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]"
            >
              🚀 Confirm Booking
            </button>
          </div>
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
    </div>
  );
};

export default Booking;
