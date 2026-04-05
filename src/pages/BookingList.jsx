import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const BookingList = () => {
  const container = useRef();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Database se bookings fetch karna
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await axios.get("http://localhost:3005/api/bookings");
        if (response.data.success) {
          setBookings(response.data.bookings);
        }
      } catch (error) {
        console.error("Failed to fetch bookings", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  // GSAP Animations (Triggers after data load)
  // useGSAP(
  //   () => {
  //     if (!loading && bookings.length >= 0) {
  //       gsap.from(".header-anim", {
  //         y: -30,
  //         opacity: 0,
  //         duration: 0.8,
  //         ease: "power3.out",
  //       });

  //       gsap.from(".booking-card", {
  //         y: 50,
  //         opacity: 0,
  //         duration: 0.6,
  //         stagger: 0.15,
  //         ease: "back.out(1.2)",
  //       });

  //       gsap.from(".action-btns", {
  //         y: 30,
  //         opacity: 0,
  //         duration: 0.6,
  //         delay: 0.5,
  //         ease: "power2.out",
  //       });
  //     }
  //   },
  //   { scope: container, dependencies: [bookings, loading] },
  // );

  return (
    <div
      ref={container}
      className="min-h-screen flex items-center justify-center bg-gray-900 py-32"
    >
      <div className="w-full mx-auto px-6 max-w-7xl">
        <h1 className="header-anim text-4xl font-bold text-center mb-12 gradient-text">
          🎮 All Bookings
        </h1>

        {loading ? (
          <div className="text-center text-purple-500 font-semibold text-xl animate-pulse">
            Loading your gaming sessions...
          </div>
        ) : bookings.length === 0 ? (
          <p className="header-anim text-center text-gray-400 text-lg">
            No bookings yet. Start your gaming journey today!
          </p>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {bookings.map((booking) => (
              <div
                key={booking._id}
                className="booking-card bg-gray-800/60 backdrop-blur-lg border border-gray-700/50 p-6 rounded-2xl shadow-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:border-purple-500/50 transition-all transform hover:-translate-y-2"
              >
                <h2 className="text-2xl font-semibold text-purple-400 mb-4 border-b border-gray-700 pb-2 flex items-center">
                  <span className="mr-2">👤</span> {booking.name}
                </h2>

                <div className="space-y-3 text-gray-300">
                  <p className="flex items-center">
                    <span className="w-8">📧</span>
                    <span className="truncate" title={booking.email}>
                      {booking.email}
                    </span>
                  </p>
                  <p className="flex items-center">
                    <span className="w-8">📞</span> {booking.phone}
                  </p>
                  <p className="flex items-center">
                    <span className="w-8">👥</span> {booking.membersCount}{" "}
                    Members
                  </p>
                  <p className="flex items-center">
                    <span className="w-8">💻</span> Type:{" "}
                    <span className="ml-1 text-purple-300 font-bold">
                      {booking.bookingType}
                    </span>
                  </p>
                </div>

                {booking.membersName && booking.membersName.length > 0 && (
                  <div className="mt-4 bg-gray-700/30 p-3 rounded-lg">
                    <p className="font-semibold text-gray-200 mb-1 flex items-center">
                      📝 Names:
                    </p>
                    <p className="text-purple-300 text-sm">
                      {booking.membersName.join(", ")}
                    </p>
                  </div>
                )}

                <div className="mt-5 bg-purple-900/20 border border-purple-500/20 p-4 rounded-xl">
                  <p className="text-sm text-gray-400 mb-1">
                    ⏰ Session Timing:
                  </p>
                  <p className="text-white font-medium text-sm flex flex-col space-y-1">
                    <span>
                      Start:{" "}
                      {new Date(booking.bookingTime.start).toLocaleString(
                        "en-IN",
                        { dateStyle: "medium", timeStyle: "short" },
                      )}
                    </span>
                    <span className="text-purple-400">↓</span>
                    <span>
                      End:{" "}
                      {new Date(booking.bookingTime.end).toLocaleString(
                        "en-IN",
                        { dateStyle: "medium", timeStyle: "short" },
                      )}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-btns text-center mt-16 flex flex-col items-center space-y-4">
          <Link
            to="/booking"
            className="bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-xl text-lg font-semibold transition-all transform hover:scale-105 hover:shadow-[0_0_15px_rgba(168,85,247,0.5)] inline-block w-full max-w-xs"
          >
            ➕ New Booking
          </Link>
          <Link
            to="/"
            className="bg-gray-700 hover:bg-gray-600 px-8 py-3 rounded-xl text-white font-semibold transition-all transform hover:scale-105 shadow-md inline-block w-full max-w-xs"
          >
            🏠 Go Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BookingList;
